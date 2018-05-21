'''Missionaries.py
("Missionaries and Cannibals" problem)
A SOLUZION problem formulation, for SZ001.py.

This formulation uses a State class, and so it
is different from the 1.1 version that used
a dict object directly as the state.
'''
#<METADATA>
SOLUZION_VERSION = "2.0"
PROBLEM_NAME = "Missionaries and Cannibals"
PROBLEM_VERSION = "2.0"
PROBLEM_AUTHORS = ['S. Tanimoto']
PROBLEM_CREATION_DATE = "16-APR-2017"

# The following field is mainly for the human solver, via either the Text_SOLUZION_Client.
# or the SVG graphics client.
PROBLEM_DESC=\
 '''The <b>"Missionaries and Cannibals"</b> problem is a traditional puzzle
in which the player starts off with three missionaries and three cannibals
on the left bank of a river.  The object is to execute a sequence of legal
moves that transfers them all to the right bank of the river.  In this
version, there is a boat that can carry at most three people, and one of
them must be a missionary to steer the boat.  It is forbidden to ever
have one or two missionaries outnumbered by cannibals, either on the
left bank, right bank, or in the boat.  In the formulation presented
here, the computer will not let you make a move to such a forbidden situation, and it
will only show you moves that could be executed "safely."
'''
#</METADATA>

#<COMMON_DATA>
#</COMMON_DATA>

#<COMMON_CODE>
M=0  # array index to access missionary counts
C=1  # same idea for cannibals
LEFT=0 # same idea for left side of river
RIGHT=1 # etc.

class State():
  def __init__(self, d):
    self.d = d
    self.mode = "choosing"
    self.n_ready = 0
    self.scores = {}
    self.announce = ""

  def __copy__(self):
    # Performs an appropriately deep copy of a state,
    # for use by operators in creating new states.
    # A state maps usernames to play integers.
    news = State({})
    for key in self.d.keys():
      news.d[key] = self.d[key]
    news.d['people']=[[0,0],[0,0]]
    for i in range(2): news.d['people'][i]=self.d['people'][i][:]
    news.d['boat'] = self.d['boat']
    return news

  def __str__(self):
    ''' Produces a textual description of a state.
        Might not be needed in normal operation with GUIs.'''
    p = self.d['people']
    txt = "M on left:"+str(p[M][LEFT])+"\n"
    txt += "C on left:"+str(p[C][LEFT])+"\n"
    txt += "  M on right:"+str(p[M][RIGHT])+"\n"
    txt += "  C on right:"+str(p[C][RIGHT])+"\n"
    side='left'
    if self.d['boat']==1: side='right'
    txt += " boat is on the "+side+".\n"
    return txt

  def __eq__(self, s):
    if len(self.d) != len(s.d): return False

    if s.d['boat'] != self.d['boat']: return False
    p1 = s['people']; p2 = self.d['people']
    if p1[0] != p2[0]: return False
    if p1[1] != p2[1]: return False
    return True

  def __hash__(self):
    return (self.__str__()).__hash__()
#---------------------
def can_move(s,m,c,role_number=0):
  '''Tests whether it's legal to move the boat and take
     m missionaries and c cannibals.'''
  side = s.d['boat'] # Where the boat is.
  p = s.d['people']
  if m<1: return False # Need an M to steer boat.
  m_available = p[M][side]
  if m_available < m: return False # Can't take more m's than available
  c_available = p[C][side]
  if c_available < c: return False # Can't take more c's than available
  m_remaining = m_available - m
  c_remaining = c_available - c
  # Missionaries must not be outnumbered on either side:
  if m_remaining > 0 and m_remaining < c_remaining: return False
  m_at_arrival = p[M][1-side]+m
  c_at_arrival = p[C][1-side]+c
  if m_at_arrival > 0 and m_at_arrival < c_at_arrival: return False
  return True

def move(olds,m,c):
  '''Assuming it's legal to make the move, this computes
     the new state resulting from moving the boat carrying
     m missionaries and c cannibals.'''
  s = olds.__copy__() # start with a deep copy.
  side = s.d['boat']
  p = s.d['people']
  p[M][side] = p[M][side]-m     # Remove people from the current side.
  p[C][side] = p[C][side]-c
  p[M][1-side] = p[M][1-side]+m # Add them at the other side.
  p[C][1-side] = p[C][1-side]+c
  s.d['boat'] = 1-side            # Move the boat itself.
  return s

# def describe_state(s):
#   # Produces a textual description of a state.
#   # Might not be needed in normal operation with GUIs.
#   p = s['people']
#   txt = "M on left:"+str(p[M][LEFT])+"\n"
#   txt += "C on left:"+str(p[C][LEFT])+"\n"
#   txt += "  M on right:"+str(p[M][RIGHT])+"\n"
#   txt += "  C on right:"+str(p[C][RIGHT])+"\n"
#   side='left'
#   if s['boat']==1: side='right'
#   txt += " boat is on the "+side+".\n"
#   return txt

def goal_test(s):
  '''If all Ms and Cs are on the right, then s is a goal state.'''
  p = s.d['people']
  return (p[M][RIGHT]==3 and p[C][RIGHT]==3)

def goal_message(s):
  return "Congratulations on successfully guiding the missionaries and cannibals across the river!"

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
INITIAL_STATE = State({'people':[[3, 0], [3, 0]], 'boat':LEFT })
#</INITIAL_STATE>

#<ROLES>
ROLES = [ {'name': 'Missionaries-and-Cannibals Player', 'min': 1, 'max': 10},
          {'name': 'Observer', 'min': 0, 'max': 25}]
#</ROLES>
#<OPERATORS>
MC_combinations = [(1,0),(2,0),(3,0),(1,1),(2,1)]

OPERATORS = [Operator(
  "Cross the river with "+str(m)+" missionaries and "+str(c)+" cannibals",
  lambda s, m1=m, c1=c, role_number=0: can_move(s,m1,c1,role_number),
  lambda s, m1=m, c1=c: move(s,m1,c1) ) 
  for (m,c) in MC_combinations]
#</OPERATORS>

#<GOAL_TEST> (optional)
GOAL_TEST = lambda s: goal_test(s)
#</GOAL_TEST>

#<GOAL_MESSAGE_FUNCTION> (optional)
GOAL_MESSAGE_FUNCTION = lambda s: goal_message(s)
#</GOAL_MESSAGE_FUNCTION>

#<STATE_VIS>
if 'BRYTHON' in globals():
 from MissionariesVisForBrython import set_up_gui as set_up_user_interface
 from MissionariesVisForBrython import render_state_svg_graphics as render_state
# from MissionariesVisForBrython import render_state_ascii_art as render_state
# if 'TKINTER' in globals(): from TicTacToeVisForTKINTER import set_up_gui

BRIFL_SVG = True # The program Missionaries_SVG_VIS_FOR_BRIFL.py is available
render_state = None
def use_BRIFL_SVG():
  global render_state
  #from  Missionaries_SVG_VIS_FOR_BRIFL import render_state as rs
  #render_state = rs
  from  Missionaries_SVG_VIS_FOR_BRIFL import render_state
#</STATE_VIS>
