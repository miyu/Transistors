"""InstantInsanity.py
   Being adapted for SOLUZION -- March 22, 2017.

   Various initial states are specified below.

   The available operators (for each cube) are the following.
       Rotate up
       Cycle right

   We've also supplied a BFS solver in Solver.py

"""

#<METADATA>
SOLUZION_VERSION = "2.0"
PROBLEM_NAME = "Instant Insanity"
PROBLEM_VERSION = "2.0"
PROBLEM_AUTHORS = ['Michael Yu', 'Brian Chan']
PROBLEM_CREATION_DATE = "17-April-2018"

# The following field is mainly for the human solver, via either the Text_SOLUZION_Client.
# or the SVG graphics client.
PROBLEM_DESC=\
 '''The <b>"Instant Insanity"</b> problem is to arrange 4 cubes in a stacked tower such that each
 of the vertical walls of the tower is of 4 different colors.
'''
#</METADATA>

#<COMMON_DATA>
#</COMMON_DATA>

#<COMMON_CODE>
#Cube indices:
#   0
#  415
#   2
#   3

# # https://nrich.maths.org/443
# CUBE1_INITIAL = 'bwrbyy'
# CUBE2_INITIAL = 'ywrbrr'
# CUBE3_INITIAL = 'bwryrw'
# CUBE4_INITIAL = 'ywrywb'

# # http://www.cs.brandeis.edu/~storer/JimPuzzles/ZPAGES/zzzInstantInsanity.html
# CUBE1_INITIAL = 'gggrbw'
# CUBE2_INITIAL = 'rwrbgb'
# CUBE3_INITIAL = 'gbwgwr'
# CUBE4_INITIAL = 'wrbwrg'

# scrambled wrbbyy, yrrrbw, wbrryw, ybwwyr
CUBE1_INITIAL = 'wrbbyy'
CUBE2_INITIAL = 'yrrrbw'
CUBE3_INITIAL = 'wbrryw'
CUBE4_INITIAL = 'ybwwyr'

class State():
  def __init__(self, d):
    self.d = d

  def __copy__(self):
    news = State([x for x in self.d])
    return news

  def __str__(self):
    ''' Produces a textual description of a state.
        Might not be needed in normal operation with GUIs.'''
    txt = ', '.join(self.d)
    return txt

  def __eq__(self, s):
    return str(self) == str(s)

  def __hash__(self):
    return (self.__str__()).__hash__()

def move(state, i, op):
  s = state.__copy__() # start with a deep copy.

  if op == 0:
    s.d[i] = s.d[i][1:4] + s.d[i][0] + s.d[i][4:]
  elif op == 1:
    s.d[i] = s.d[i][0] + s.d[i][4] + s.d[i][2] + s.d[i][5] + s.d[i][3] + s.d[i][1]
  else:
    raise Exception()

  return s

def goal_test(s):
  assert(len(s.d[0]) == 6 and len(s.d[1]) == 6 and len(s.d[2]) == 6 and len(s.d[3]) == 6)

  for i in range(0, 4):
    if len(set([cube[i] for cube in s.d])) != 4:
      return False
  return True

def goal_message(s):
  return "Congratulations on successfully guiding the cubes to the right orientation!"

class Operator:
  def __init__(self, name, state_transf):
    self.name = name
    self.state_transf = state_transf

  def is_applicable(self, s, role_number=0):
    return True

  def apply(self, s):
    return self.state_transf(s)
#</COMMON_CODE>

#<INITIAL_STATE>
INITIAL_STATE = State([CUBE1_INITIAL, CUBE2_INITIAL, CUBE3_INITIAL, CUBE4_INITIAL])
#</INITIAL_STATE>

#<ROLES>
ROLES = [ {'name': 'Player', 'min': 1, 'max': 10},
          {'name': 'Observer', 'min': 0, 'max': 25}]
#</ROLES>
#<OPERATORS>
II_combinations = [(i, op) for op in range(0, 2) for i in range(0, 4)]

def explain(i, op):
  if op == 0:
    return "Turn cube " + str(i) + " ↑"
  elif op == 1:
    return "Turn cube " + str(i) + " 🔁"
  else:
    raise Exception()

OPERATORS = [Operator(
  explain(i, op),
  lambda s, i1=i, op1=op: move(s, i1, op1) )
  for (i, op) in II_combinations]
#</OPERATORS>

#<GOAL_TEST> (optional)
GOAL_TEST = lambda s: goal_test(s)
#</GOAL_TEST>

#<GOAL_MESSAGE_FUNCTION> (optional)
GOAL_MESSAGE_FUNCTION = lambda s: goal_message(s)
#</GOAL_MESSAGE_FUNCTION>

#<STATE_VIS>
BRIFL_SVG = True # The program InstantInsanity_SVG_VIS_FOR_BRIFL.py is available
render_state = None
def use_BRIFL_SVG():
  global render_state
  from InstantInsanity_SVG_VIS_FOR_BRIFL import render_state
#</STATE_VIS>
