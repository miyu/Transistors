'''RockPaperScissors.py

STATUS: new

 SLT -- April 9, 2017


A SOLUZION problem formulation of the game
"Rock-Paper-Scissors."

The main point of this formulation is to permit
testing of the roles mechanism and formulation
issues in the new SOLUZION system.

This formulation assumes that the server will update,
via writing to the global variable 
ROLES_MEMBERSHIP_problems_copy

'''

#from SZ001 import get_users_in_role, get_username, get_num_in_role  # needed to access usernames for states contents.
#from SZ001 import get_roles

#<METADATA>
SOLUZION_VERSION = "SZ001.0"
PROBLEM_NAME = "Rock-Paper-Scissors"
PROBLEM_VERSION = "0.2"
PROBLEM_AUTHORS = ['S. Tanimoto']
PROBLEM_CREATION_DATE = "14-APR-2017"
PROBLEM_DESC=\
'''
"Rock-Paper-Scissors" is a game for 2 or more players.
In each round, players privately choose either "Scissors",
"Paper", or "Stone".  When all have chosen, a showdown
occurs in which all players get to see all choices.
Each player may beat, be beaten, or tie with each of
the others.  The rules are: scissors beats paper,
paper beats stone, and stone beats scissors. A player
accrues points in each round, but they can be positive
or negative: wins minus losses.  We declare a match
finished when a player reaches a net score of five points.

This formulation is for the SOLUZION session management
system, with roles, etc.
'''
#</METADATA>

#<COMMON_DATA>
#</COMMON_DATA>

#<COMMON_CODE>
ROCK = 0
PAPER = 1
SCISSORS = 2
NO_PLAY = 3
PLAYS = ['rock','paper','scissors', 'no play']
WIN_THRESHOLD = 5

class State:
  def __init__(self, d):
    self.d = d
    self.mode = "choosing"
    self.n_ready = 0
    self.scores = {}
    self.round_scores = {}
    self.announce = ""

  def __copy__(self):
    # Performs an appropriately deep copy of a state,
    # for use by operators in creating new states.
    # A state maps usernames to play integers.
    news = State({})
    for key in self.d.keys():
      news.d[key] = self.d[key]
    news.mode = self.mode
    news.n_ready = self.n_ready
    news.scores = self.scores 
    news.round_scores = self.round_scores 
    news.announce = self.announce
    return news

  def __str__(self):
    ''' Produces a textual description of a state.
        Might not be needed in normal operation with GUIs.'''
    txt = "Rock-paper-scissors state:\n"
    for key in self.d.keys():
      txt += "  "+key+" plays "+PLAYS[self.d[key]]+"\n"
    txt += "\nNumber of players Ready: "+str(self.n_ready)+"\n"
    txt += "mode: "+self.mode
    txt += "scores: "+str(self.scores)+"\n"
    if len(self.announce)>0: txt += "\n"+self.announce
    return txt

  # Ignore scores when testing for equality:
  def __eq__(self, s):
    if self.n_ready != s.n_ready: return False
    if len(self.d) != len(s.d): return False
    try: 
      for k in s.d.keys():
        if s.d[k] != self.d[k]: return False
    except Exception as e:
      return False
    if self.mode != s.mode: return False
    return True

def record_player_choice(s, choice):
  news = s.__copy__()
  un = get_username()
  # print("In record_player_choice, username = " + un)
  news.d[get_username()]=choice
  update_count_of_players_ready(news)
  return news

def update_count_of_players_ready(s):
  c = 0
  for k in s.d.keys():
    if s.d[k] < 3: c += 1
  s.n_ready=c

def can_choose(s, role_number):
  if role_number != 1: return False # must be an active player.
  #username = get_username()
  #print("In can_choose: username=" +username)
  #if username == 'nobody now':
  #  return False
  #return s[username]==NO_PLAY
  if s.mode != "choosing": return False
  return True


def showdown(s):
  '''Terminate this round and compute the scores earned
   by each player.  Update the scores in the game state.
   Set the mode to "awaiting new round"
  '''
  stone_folks = []
  paper_folks = []
  scissors_folks = []
  users = list(s.d.keys())
  users.sort()
  # print("In showdown, scores are "+str([s.scores[u] for u in users]))
  for u in users:
    if s.d[u]==ROCK:    stone_folks.append(u)
    if s.d[u]==PAPER:    paper_folks.append(u)
    if s.d[u]==SCISSORS: scissors_folks.append(u)
  a = "The Scoring is as follows:\n"
  news = s.__copy__()
  net_word = " nets "
  news.round_scores = {}
  for u in users:
    round_score = 0 # Handles the case of NO_PLAY.
    if s.d[u]==ROCK:
      round_score = len(scissors_folks)-len(paper_folks)
    if s.d[u]==PAPER:
      round_score = len(stone_folks)-len(scissors_folks)
    if s.d[u]==SCISSORS: 
      round_score = len(paper_folks)-len(stone_folks)
    if round_score > 0:  net_word = ' gains '
    if round_score == 0: net_word = ' nets '
    if round_score < 0:  net_word = ' loses '
    total = s.scores[u] + round_score
    a += u + net_word + str(abs(round_score)) + ' for a total of ' +str(total)+ ' points.\n'
    news.round_scores[u] = round_score
    news.scores[u] = total
  news.mode="awaiting new round"
  news.announce = a
  return news

def start_new_round(s):
  '''Set the player choices to NO_PLAY, and then
     change the mode to "Players are choosing weapons" 
     '''
  news = s.__copy__()
  for k in news.d.keys():
    news.d[k]=NO_PLAY
    news.round_scores[k]=0
  news.n_ready = 0
  news.mode="choosing"
  news.announce="Choose your weapons!"
  return news

WINNERS = []
def find_winners(s):
  global WINNERS
  WINNERS = []
  n_players = get_num_in_role(1)
  for u in s.d.keys():
    if s.scores[u] >= WIN_THRESHOLD: 
      WINNERS.append(u)
  return

def goal_test(s):
  '''The game ends when a player reaches 5 points.'''
  find_winners(s)
  return len(WINNERS)>0

def list_as_prose(lst):
  if lst==[]: return "to nobody"
  if len(lst)==1: return lst[0]
  if len(lst)==2: return lst[0]+' and '+lst[1]
  return lst[0]+', '+list_as_prose(lst[1:])

def goal_message(s):
  global WINNERS
  winner_phrase = list_as_prose(WINNERS)
  return "Congratulations "+winner_phrase+" who achieved "+str(WIN_THRESHOLD)+" points!"

# -- Beginning of code using write-back from server program.
SESSION = None
def get_session():
  return SESSION

def get_users_in_role(role_no):
  global SESSION
  rm = SESSION['ROLES_MEMBERSHIP']
  # print("ROLES_MEMBERSHIP = "+str(rm))
  if rm==None: return []
  return rm[role_no]

def get_num_in_role(role_no):
  global SESSION
  rm = SESSION['ROLES_MEMBERSHIP']
  return len(rm[role_no])

def get_username():
  global SESSION
  username = SESSION['USERNAME']
  return username

# -- End of code using write-back from server program.

class Operator:
  def __init__(self, name, precond, state_transf):
    self.name = name
    self.precond = precond
    self.state_transf = state_transf

  def is_applicable(self, s, role_number=0):
    return self.precond(s, role_number=role_number)

  def apply(self, s):
    return self.state_transf(s)

#</COMMON_CODE>

#<INITIAL_STATE>
INITIAL_STATE = None
def initial_state_maker():
  global INITIAL_STATE
  my_usrs = get_users_in_role(1)
  #  print("In initial_state_maker, get_users_in_role(0) returns "+str(my_usrs))
  INITIAL_STATE = State({ uname: NO_PLAY for uname in my_usrs })
  INITIAL_STATE.scores = { uname: 0 for uname in my_usrs }
#</INITIAL_STATE>
#<ROLES>
ROLES = [ {'name': 'The Official', 'min': 1, 'max': 1},
          {'name': 'Rock-Paper-Scissors Player', 'min': 2, 'max': 25},
          {'name': 'Observer', 'min': 0, 'max': 25}]
#</ROLES>
#<OPERATORS>
OPERATORS = [\
  Operator("Choose ROCK",
           lambda s,role_number=0: can_choose(s,role_number),
           lambda s: record_player_choice(s, ROCK)),
  Operator("Choose PAPER",
           lambda s,role_number=0: can_choose(s,role_number),
           lambda s: record_player_choice(s, PAPER)),
  Operator("Choose SCISSORS",
           lambda s,role_number=0: can_choose(s,role_number),
           lambda s: record_player_choice(s, SCISSORS)),
  Operator("Showdown!",
           lambda s,role_number=1: role_number==0 and s.mode=="choosing",
           lambda s: showdown(s)),
  Operator("Start new round!",
           lambda s,role_number=1: (role_number==0 and s.mode=="awaiting new round"),
           lambda s: start_new_round(s))]
#</OPERATORS>

#<GOAL_TEST> (optional)
GOAL_TEST = lambda s: goal_test(s)
#</GOAL_TEST>

#<GOAL_MESSAGE_FUNCTION> (optional)
GOAL_MESSAGE_FUNCTION = lambda s: goal_message(s)
#</GOAL_MESSAGE_FUNCTION>

#<STATE_VIS>
# if 'TKINTER' in globals(): from CircularShuntingVisForTKINTER import set_up_gui
BRIFL_SVG = True # The program RockPaperScissors_SVG_VIS_FOR_BRIFL.py is available
render_state = lambda s: True
def use_BRIFL_SVG():
  global render_state
  from  RockPaperScissors_SVG_VIS_FOR_BRIFL import render_state
  #print("Leaving use_BRIFL_SVG in RockPaperScissors.py")
#</STATE_VIS>
