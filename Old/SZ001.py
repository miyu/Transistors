#!/usr/local/bin/python3
#!/usr/bin/python3

'''SZ001.py

THE PURPOSE OF THIS PROGRAM:

This is a client-server problem-solving facility called SZ (for
"SOLUZION").  It loads a "problem formulation" file in the SOLUZION
format, which means Python code organized in a particular way.

ROLES:

A special feature of SZ is the ability to manage "roles" in
problem-solving sessions.  A role is some set of capabilities and a
view of the session intended for some particular user or group of
users.  For example, if the problem is to achieve a stabilization of
global warming, there may be a role for scientist who chooses among
financially viable interventions that should be applied, but there
could also be an adversarial role for a "denier" who tries to undercut
efforts to fund the programs required to solve the problem.

TECHNOLOGY:

This program is intented to be run in a Unix (e.g., Linux) environment.
It loads several Python modules including some that are not part of
the standard Python 3 distribution, and so they must be installed
separately:

flask
svgwrite
flask_socketio

This program (SZ001.py) was initially a variation of app.py (from below)
to which some SOLUZION-like elements were added.

The app.py  example comes from:
https://blog.miguelgrinberg.com/post/easy-websockets-with-flask-and-gevent

This file SZ001.py (as well as the particular problem-formulation file
that is read in) constitute the SERVER part of a client-server system.
The client code is sent by the server, on request, to a browser that
request it.  The client code normally lives on the server in the "templates"
folder.  It's a Jinja template that is mostly HTML, which gets processed
into a complete HTML5 page when it is served.  Its filename is index.html.
That file includes a certain amount of Javascript, and it also loads in
some Javascript libraries, when run in the browser.  This Javascript
code allows it to carry out a long term "conversation" with the server,
never leaving the one web page that the file defines.  The communication
between client and server, begins as normal HTTP to load the page.
However, it immediately afterwards establishes a web-socket communication
channel, which has two advantages over the more common mode which is
Ajax interaction.  One advantage is low message overhead over the socket:
whereas an Ajax transaction has quite a bit of overhead, a socket message
has much less.  The second advantage is that the server can "push"
messages to one or more clients without the clients explicitly polling
for new messages from the server.  This simplifies the broadcast of
state updates in a multiuser context, when one user makes a change that
all other users in the same session need to see immediately.

To run this, cd into the subdirectory representing a problem formulation
such as RockPaperScissors.  Then type
../SZ001.py RockPaperScissors
Then point a browser at NICTO.CS.WASHINGTON.EDU:5000.

Or use a port number as an additional argument:
../SZ001.py RockPaperScissors 5432

'''
from flask import Flask, render_template, session, request,\
    jsonify, send_from_directory, safe_join, send_file
from flask_socketio import SocketIO, emit, join_room, leave_room, \
    close_room, rooms, disconnect

DEBUG = False

HOST = 'nicto.cs.washington.edu'
PORT = 5000 # Default port, overridden by optional command-line arg.

import os
CURR_DIR = os.getcwd()
THE_DIR = ''
GAME_IN_PROGRESS = False
ROLES_FROZEN = False

'''
Set variable async_mode to "threading", "eventlet" or "gevent"
to test the different async modes, or leave it set to None
for the application to choose the best option based on
installed packages.
Note: As of April 8, 2017, in the Nicto server environment,
these three choices seem to result in the same app behavior,
which is some kind of polling.  The "eventlet" option raises
an error.'''
#async_mode = "gevent"
#sync_mode = "threading"
async_mode = None

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode=async_mode)

# import code
# code.InteractiveConsole(locals=globals()).interact()

# The SESSION data structure will be made accessible to
# both the problem formulation file that SZ imports,
# the visualization file imported by the problem formulation
# file.  This is done by SZ writing a reference to the
# session into the imported namespace of the formulation.
SESSION = None
def init_session():
    global SESSION
    SESSION = {\
           'USERNAMES': {},
           'NUMBER_OF_USERS': 0,
           'USER_NUMBERS': {},
           'SESSION_OWNER': None,
           'ROLES_MEMBERSHIP': None,
           'USERNAME': 'nobody now',
           'HOST': HOST,
           'PORT': PORT}

init_session()

ROLES = []

def initialize_roles_membership():
  global SESSION, ROLES
  if DEBUG: print("In initialize_roles_membership, ROLES = "+str(ROLES))
  SESSION['ROLES_MEMBERSHIP'] = [[] for i in range(len(ROLES))]
  # initializes the many-to-many mapping between users and roles.
  # Elements will be lists of username strings.
  write_back_to_problem()  # Makes this, as part of the session, 
  # available to the problem formulation code.

def write_back_to_problem():
  global SESSION
  PROBLEM.SESSION = SESSION

def get_users_in_role(role_no):
  global SESSION, ROLES
  if DEBUG: print("In get_users_in_role, ROLES = "+str(ROLES))
  rm = SESSION['ROLES_MEMBERSHIP']
  if DEBUG: print("ROLES_MEMBERSHIP = "+str(rm))
  if rm==None: return []
  return rm[role_no]

def get_num_in_role(role_no):
  global SESSION
  return len(SESSION['ROLES_MEMBERSHIP'][role_no])

def get_username():
  global SESSION
  return SESSION['USERNAME']

def get_roles():
  return ROLES[:]

ROLES_DATA = None;  # List will be generated whenever updated, and sent to clients.
 
@app.route('/')
def index():
  return render_template('index.html', async_mode=socketio.async_mode,
                         port=PORT)

# The following route is what the Flask server will use when
# satisfying requests from the browser to send images related to
# the problem state being displayed.  The images should reside
# right in the same folder as the problem formulation file.
@app.route('/get_image/<image_filename>')
def get_image(image_filename):
  global CURR_DIR
  print("Trying to get, at path "+CURR_DIR+", the image: "+image_filename)
  return send_file(THE_DIR+"/"+image_filename, mimetype='image/png')  
  # The png designation may work OK even with jpg and gif images,
  # if the browser is smart enough to figure out the real image format
  # when the file arrives.

# SOLUZION session management...
#  The first client to connect after this server is started
#  is designated the "session owner".
#  Subsequent participants are just participants and don't see the owner panel.

def update_roles_data():
    '''Create a list of roles, each of which is a dictionary,
       that contains all the information a browser needs to know
       about.  This will allow the browser to show what the roles
       are and who is in those roles right now.'''

    global ROLES, ROLES_DATA, SESSION
    ROLES_DATA = []
    rm = SESSION['ROLES_MEMBERSHIP']
    for i, role in enumerate(ROLES):
      this_role = {'desc': role['name'], 'min': role['min'], 'max': role['max']}
      this_role['who'] = rm[i]
      this_role['current'] = len(rm[i])
      ROLES_DATA.append(this_role)

#def compute_roles_taken():
#    return "None yet"

@socketio.on('abort_entire_session', namespace='/session')
def abort_entire_session():
    print("request received to abort_entire_session.")
    socketio.emit('aborting_session',\
                  namespace='/session',\
                  broadcast=True)  # broadcasts to all clients
 
    # Note, the session is not really aborted until all clients
    # have received this message, requested being disconnected,
    # and are disconnected.
    # This feature is not working reliably, because flask_socketio
    # does not directly support getting a list of all connected
    # clients.

@socketio.on('please_disconnect', namespace='/session')
def handle_please_disconnect():
    print("please_disconnect received.")
    disconnect()
    SESSION['USERNAMES']={} # Reset the list of users, as part of
    # attempting to abort the whole session.
    # This message should only ever come in when session aborting
    # has been initiated from the session owner.
    # In some cases, a new session can be established without
    # the inconvenience of killing and restarting this SZ001
    # server process.

def frozen_status_changed():
    '''This gets called when the session owner has requested
       that the roles be frozen or unfrozen.'''
    global ROLES_FROZEN
    emit('roles_frozen_status_changed',
         ROLES_FROZEN,
         broadcast=True)

@socketio.on('role_request', namespace='/session')
def role_request(data):
    '''This is called when a client has clicked to join or 
       leave a role.  It won't get called if roles are frozen.'''
    global SESSION, ROLES_DATA
    global ROLES_FROZEN
    if ROLES_FROZEN: return
    username = data['username']
    role_no = data['role_number']
    join_or_quit = data['join_or_quit']
    rm = SESSION['ROLES_MEMBERSHIP']

    if DEBUG: print("User "+data['username']+" has requested to "+
          data['join_or_quit']+" role number "+str(data['role_number']))
    current_members = rm[role_no]
    current_status = username in current_members
    join = True
    changed = False
    if (join_or_quit=='join_or_quit') and current_status: join = False
    if join and not current_status:
      if current_members == []:
        rm[role_no] = [username]
      else:
        current_members.append(username)
      changed = True
    if (not join) and current_status:
      current_members.remove(username)
      changed = True
    if changed:
      update_roles_data()
      emit('roles_announcement', {'roles_data': ROLES_DATA}, broadcast=True)
    else:
      emit('alert', "No change has been made to your role(s).")
    if DEBUG: print("After role_request, ROLES_MEMBERSHIP = "+str(rm))

@socketio.on('disconnect_request', namespace='/session')
def disconnect_request():
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my_response',
         {'data': 'Disconnected!', 'count': session['receive_count']})
    disconnect()

@socketio.on('connect', namespace='/session')
def session_connect():
    '''This function gets called each time a new socket connection is
       made by a client.'''
    if DEBUG: print("'connect' requested.")
    send_problem_info()
    global SESSION
    rm = SESSION['ROLES_MEMBERSHIP']
    if rm==None: 
       initialize_roles_membership()
       update_roles_data()
#    emit('my_response', {'data': 'Connected', 'count': 0})
    if SESSION['SESSION_OWNER']: 
        emit('session_owner', {'session_owner': SESSION['SESSION_OWNER']})
    emit('roles_announcement', {'roles_data': ROLES_DATA})

@socketio.on('add user', namespace='/session')
def add_user(this_users_name):
     '''This gets called right after a user enters their username
        and asks to join the session.'''
     global SESSION, ROLES_DATA
     usernames = SESSION['USERNAMES']

     if this_users_name in usernames.keys():
        print("Username "+this_users_name+" is already taken.")
        emit('taken', { 'name_already_taken' : this_users_name })
        return

     print('Adding User: '+str(this_users_name))
     session['username'] = this_users_name
     usernames[this_users_name] = session['username']
     SESSION['NUMBER_OF_USERS'] += 1;
     number_of_users = SESSION['NUMBER_OF_USERS']
     #SESSION['USER_NUMBERS'][data] = number_of_users
     if number_of_users == 1:
       SESSION['SESSION_OWNER'] = this_users_name
 
     emit('login', { 'numUsers' : number_of_users,
                     'username' : this_users_name })
     emit('session_owner', { 'session_owner' : SESSION['SESSION_OWNER'] })
     emit('user joined', { 'username' : session['username'],\
                           'numUsers': number_of_users }, broadcast=True)
     update_roles_data()
     emit('roles_announcement', {'roles_data': ROLES_DATA})
     if GAME_IN_PROGRESS: emit_problem_state()

@socketio.on('disconnect', namespace='/session')
def session_disconnect():
    print('Client disconnected', request.sid)

# Soluzion specific stuff:
@socketio.on('command', namespace='/session')
def command(data):
  exec_command(data, False)

def exec_command(data, local):  
    # print("Process command", data)
    global PROBLEM, STATE_SVG, DEBUG, CURRENT_STATE
    global GAME_IN_PROGRESS, ROLES_FROZEN, ROLES, ROLES_DATA
    cmd = data['command']
    SESSION['USERNAME']=data['username']
    if DEBUG: print("command received: "+str(cmd))
    if cmd=="H" or cmd=="h":
        emit('show_help', {'message': show_instructions()})
    if cmd=="start":
        if GAME_IN_PROGRESS:
          emit('game_already_in_progress')
          return
        initialize_problem()
        try: 
           if PROBLEM.BRIFL_SVG:
            STATE_SVG = PROBLEM.render_state(CURRENT_STATE)
            if DEBUG: print("A new state graphic was produced.")
        except Exception as e:
           print("There was an exception when trying to do SVG rendering of the CURRENT_STATE.")
           print(e)
        emit('message', {'message':\
        "You may begin solving the problem by choosing an operator to apply."})
        GAME_IN_PROGRESS = True
        return
    if cmd=="cancel_game":
      if not GAME_IN_PROGRESS:
          emit('no_game_in_progress')
          return
      GAME_IN_PROGRESS = False
      make_all_inapplicable()
      emit('game_canceled', broadcast=True)
      return
    if cmd=="freeze_roles":
      if ROLES_FROZEN: return
      ROLES_FROZEN = True;
      frozen_status_changed()
      return
    if cmd=="unfreeze_roles":
      if not ROLES_FROZEN: return
      ROLES_FROZEN = False;
      frozen_status_changed()
      return
    if cmd=="evict_all_from_roles":
      SESSION['ROLES_MEMBERSHIP'] = [[] for i in range(len(ROLES))]
      update_roles_data()
      emit('roles_announcement', {'roles_data': ROLES_DATA}, broadcast=True)
      return
    #---at this point the command should a number
    #---indicating which operator to apply
    if not GAME_IN_PROGRESS: return
    try:
      i = int(cmd)
    except:
      if DEBUG: print("Unknown command or bad operator number.")
      return # mes("Unknown command or bad operator number.")
    if DEBUG: print("Operator "+str(i)+" selected.")
    if i<0 or i>= len(OPERATORS):
      if DEBUG: print("There is no operator with number "+str(i))
      return # mes("There is no operator with number.")

    if i == 0: return

    CURRENT_STATE = OPERATORS[i].apply(CURRENT_STATE)
    STATE_STACK.append(CURRENT_STATE)

# Step 1 to update browser
    try: 
      if PROBLEM.BRIFL_SVG:
          STATE_SVG = PROBLEM.render_state(CURRENT_STATE)
          if DEBUG: print("A new state graphic was produced.")
    except Exception as e:
      print("There was an exception when trying to do SVG rendering of the CURRENT_STATE.")
      print(e)

# Step 2 to update browser
    emit_problem_state()
    update_applicability_vector(CURRENT_STATE)

    if PROBLEM.goal_test(CURRENT_STATE): return(handle_win())
        
    return

def handle_win():
    mes=PROBLEM.goal_message(CURRENT_STATE)
    print(mes)
    emit('win_announcement', mes, broadcast=True)

STEP, DEPTH, OPERATORS, CURRENT_STATE, STATE_STACK, NEW_SESSION = 6*[None]
def initialize_problem():
  global STEP, DEPTH, OPERATORS, CURRENT_STATE, STATE_STACK,\
    NEW_SESSION, STATE_SVG
  if not PROBLEM.INITIAL_STATE:
    if DEBUG: print("Calling initial_state_maker()")
    write_back_to_problem()
    PROBLEM.initial_state_maker()
    # Some problems need to create the state AFTER players have signed up.
  CURRENT_STATE = (PROBLEM.INITIAL_STATE).__copy__()
  if DEBUG: print("In initialize_problem, CURRENT_STATE = " + str(CURRENT_STATE))
  NEW_SESSION = True
  STATE_STACK = [CURRENT_STATE]
  STEP = 0
  DEPTH = 0
  update_applicability_vector(CURRENT_STATE) 
  if DEBUG: print("In initialize_problem, PROBLEM.BRIFL_SVG = " + str(PROBLEM.BRIFL_SVG))
  try: 
     if PROBLEM.BRIFL_SVG: STATE_SVG = PROBLEM.render_state(CURRENT_STATE)
     emit_problem_state()
  except Exception as e:
     print("There was an exception when trying to do SVG rendering of the CURRENT_STATE.")
     print(e)

def emit_problem_state():
    global CURRENT_STATE, STATE_SVG
    if DEBUG: print("in emit_problem_state.")
    socketio.emit('problem_state',\
                  {'state': str(CURRENT_STATE), 'vis': STATE_SVG},\
                  namespace='/session',\
                  broadcast=True)  # broadcasts to all clients

@socketio.on('make_move', namespace='/session') # change namespace to '/game' ??
def make_move(message):
    global SESSION
    operator_no = message['op_no']
    SESSION['USERNAME'] = message['username']
    if DEBUG: print('User '+SESSION['USERNAME']+' requests applying operator '+str(op_no))

def show_instructions():
  return '''\nINSTRUCTIONS:\n
The current state of your problem session represents where you
are in the problem-solving process.  You can try to progress
forward by applying an operator to change the state.
To do this, click on the description of one of the applicable operators.
The program shows you a list of what operators are 
applicable in the current state.

If you reach a goal state, you have solved the problem,
and the computer will usually tell you that, but it depends
on what kind of problem you are solving.'''

import sys, os, importlib.util
sys.path.append(os.getcwd())

PROBLEM=None; THE_DIR=None; NEW_SESSION=None
ROLE_APPLICABILITY_VECTORS=None; STATE_IMAGE=None; STATE_SVG=None
OPERATORS=None; STATE_STACK=None; TITLE=None; OK_OPS_STRING=None
def load_the_problem_formulation_and_port():
  # Get the PROBLEM name from the command-line arguments
  global PROBLEM, THE_DIR, NEW_SESSION, ROLE_APPLICABILITY_VECTORS,\
    OPERATORS, STATE_STACK, TITLE, OK_OPS_STRING,\
    STATE_IMAGE, STATE_SVG, ROLES , THE_DIR
  if len(sys.argv)<2:
    print('''
       Usage: 
Flask_SOLUZION_Client_Server.py <PROBLEM NAME> [PORT]
       For example:
Flask_SOLUZION_Client_Server.py Missionaries 5000
    ''')
    exit(1)
  
  problem_name = sys.argv[1]
  #THE_DIR = problem_name # Used in routing, if the vis code loads any image files.
  global PORT
  if len(sys.argv)==3:
    try:
      port_string = sys.argv[2]
      PORT = int(port_string)
    except Exception as e:
      print("Bad port number argument; it must be an integer. " + str(e))
      print("Using the default port: " + str(PORT))
  print("problem_name = "+problem_name)

  try:
    spec = importlib.util.spec_from_file_location(problem_name, problem_name+".py")
    PROBLEM = spec.loader.load_module()

    PROBLEM.setup(
      lambda: GAME_IN_PROGRESS, 
      socketio,
      exec_command
    )
    #spec.loader.exec_module(PROBLEM)
  except Exception as e:
    print(e)
    exit(1)


  ROLES = PROBLEM.ROLES
  if DEBUG: print("In load problem, ROLES = "+str(ROLES))
  
  THE_DIR = problem_name # Used in routing, if the vis code loads any image files.

  NEW_SESSION = True
  ROLE_APPLICABILITY_VECTORS = None
  STATE_IMAGE = ''
  STATE_SVG = ''
  OPERATORS=PROBLEM.OPERATORS
  STATE_STACK = []
  TITLE="SOLUZION Session Manager (Version 0-2)"
  SESSION['HOST']=HOST
  SESSION['PORT']=PORT

  if PROBLEM.BRIFL_SVG:
    PROBLEM.use_BRIFL_SVG()
    print("Using BRIFL SVG.")

def send_problem_info():
  emit('problem_info',{'problem_title': PROBLEM.PROBLEM_NAME,
                       'problem_authors': list_to_nice_string(PROBLEM.PROBLEM_AUTHORS),
                       'problem_desc': PROBLEM.PROBLEM_DESC,
                       'problem_version': PROBLEM.PROBLEM_VERSION,
                       'problem_creation_date': PROBLEM.PROBLEM_CREATION_DATE,
                       'operator_names': [op.name for op in OPERATORS] })

def list_to_nice_string(lst):
    if len(lst)==1: return lst[0]
    if len(lst)==2: return lst[0]+' and '+lst[0]
    return lst[0]+', '+list_to_nice_string(lst[1:])

#print("Test of list_to_nice_string...")
#print(list_to_nice_string(['A. Baum', 'B. Campbell', 'C. Dong', 'D. Edsel']))

def update_applicability_vector(s):
  '''New version of this function returns a list of applicability vectors,
  one for each role.  We assume that the operators' preconditions can
  take a role_number (keyword) argument after the normal one (state).'''
  global OPERATORS, ROLE_APPLICABILITY_VECTORS 
  
  ROLE_APPLICABILITY_VECTORS =\
    [[op.is_applicable(s, role_number=i) for op in OPERATORS] \
    for i in range(len(ROLES))]
    
  # emit('op_applicability', ROLE_APPLICABILITY_VECTORS, broadcast=True)
  # socketio.emit('problem_state',\
  #               {'state': str(CURRENT_STATE), 'vis': STATE_SVG},\
  #               namespace='/session',\
  #               broadcast=True)  # broadcasts to all clients

  # broadcasts to all clients
  socketio.emit('op_applicability', ROLE_APPLICABILITY_VECTORS, namespace='/session', broadcast=True)

def make_all_inapplicable():
    ROLE_APPLICABILITY_VECTORS =\
     [[False for op in OPERATORS] \
      for i in range(len(ROLES))]

if __name__ == '__main__':
    load_the_problem_formulation_and_port()
    print("Listening at "+HOST+":"+str(PORT))
    socketio.run(app, host=HOST, port=PORT, debug=DEBUG)
