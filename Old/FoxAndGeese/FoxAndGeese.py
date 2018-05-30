'''FoxAndGeese.py
("Fox and Geese" game)
A SOLUZION problem formulation, for SZ001.py.

This formulation uses a State class.
Working as of April 29.

'''
#<METADATA>
SOLUZION_VERSION = "2.0"
PROBLEM_NAME = "Fox and Geese"
PROBLEM_VERSION = "2.0"
PROBLEM_AUTHORS = ['S. Tanimoto']
PROBLEM_CREATION_DATE = "28-APR-2017"

# The following field is mainly for the human solver, via either the Text_SOLUZION_Client.
# or the SVG graphics client.
PROBLEM_DESC=\
 '''The game of <b>"Fox and Geese"</b> problem is a traditional game
played on a checkerboard, using four white checkers and one black checker.
One player playes the four white "geese" and the other player plays
the black "fox".  Like checkers, only black squares are used on the
checkerboard.  The four geese are lined up on one side of the board
and the fox is on a black square on the opposite side.  The object
of the game is different for the fox than for the geese.  The fox
must "get past" the geese and make it to the other side of the board
(where the geese start).  The geese have the goal of trapping the
fox, boxing him in so he can't move.  Although the geese have an
advantage in numbers, they have two limitations: (1) each goose
can only move forward (diagonally, as in checkers), whereas the
fox can move forward or backward (like a king in checkers);
(2) only one of the geeze can move in any given turn.
Unlike checkers, there is no capturing, no becoming a kind, and
no jumping.  The fox loses if he has no available moves.
The fox gets to move first.

'''
#</METADATA>

#<COMMON_DATA>
#</COMMON_DATA>
WHITE_SQ = 0
BLACK_SQ = 1
FOX = 2
GOOSE = 3
SYMBOLS = ['-','#','F','G']
FOX_ROLE = 0
GEESE_ROLE = 1
#<COMMON_CODE>
DEBUG=False

class State():
  def __init__(self, foxCoords, coordsOfGeese, foxsTurn):
    self.foxCoords = foxCoords
    self.coordsOfGeese = coordsOfGeese
    self.foxsTurn = foxsTurn

  def __copy__(self):
    # Performs an appropriately deep copy of a state,
    # for use by operators in creating new states.
    # A state maps usernames to play integers.
    news = State(None, None, None)
    news.foxCoords = self.foxCoords[:]
    news.coordsOfGeese = self.coordsOfGeese[:]
    news.foxsTurn = self.foxsTurn
    return news

  def __str__(self):
    ''' Produces a textual description of a state.
        Might not be needed in normal operation with GUIs.'''
    arr = self.toArray()
    txt = ''
    for row in arr:
       for sq in row:
         txt += SYMBOLS[sq]+' '
       txt += "\n"
    if self.foxsTurn:
       txt += "Fox's Turn"
    else:
       txt += "Geese's Turn"
    return txt

  def toArray(self):
    arr = []
    for i in range(8):
      row = 8*[WHITE_SQ]
      for j in range(8):
        if (i+j)%2 == 1: row[j] = BLACK_SQ
      arr.append(row)
    foxrow, foxcol = self.foxCoords
    arr[foxrow][foxcol]=FOX
    try:
     for (gooserow, goosecol) in self.coordsOfGeese:
      arr[gooserow][goosecol]=GOOSE
     return arr
    except:
     return arr

  def __eq__(self, s):
    if self.foxsTurn != s.foxsTurn: return False
    if self.foxCoords[0] != s.foxCoords[0]: return False
    if self.foxCoords[1] != s.foxCoords[1]: return False
    gself = self.coordsOfGeese
    gother = s.coordsOfGeese
    for i in range(4):
        if gself[i][0] != gother[i][0]: return False
        if gself[i][1] != gother[i][1]: return False
    return True

  def __hash__(self):
    return (self.__str__()).__hash__()
#---------------------

class Precondition():
  def __init__(self, source, direction):
    self.source = source
    self.direction = direction

  def __call__(self, state, role_number=FOX_ROLE):
    if DEBUG:
      print("Testing precondition for role: "+str(role_number)+" sq.no. "+str(self.source)+", direction "+self.direction)
      if role_number==FOX_ROLE:
        print(state)
    if (role_number==GEESE_ROLE and state.foxsTurn) or (role_number==FOX_ROLE and not state.foxsTurn):
      if DEBUG:
        print("Wrong role.")
      return False 
    if role_number==GEESE_ROLE:
      if self.direction in ['SW', 'SE']:
        if DEBUG:
          print("Geese cannot move backwards.")
        return False
    arr = state.toArray()
    (i,j) = coords_from_square_number(self.source)
    # Piece to move must be at source location.
    source_piece = arr[i][j]
    if [FOX, GOOSE][role_number]!= source_piece:
      if DEBUG:
        print("The move doesn't have a proper piece at source position.")
        print("Position="+str((i,j))+"; source_piece="+str(source_piece))
      return False 
    (di,dj) = deltas_from_direction(self.direction)
    if i+di < 0 or i+di > 7: 
       if DEBUG:
         print("Would move too high or low.")
       return False
    if j+dj < 0 or j+dj > 7: 
       if DEBUG:
         print("Would move too far left or right.")
       return False
    if arr[i+di][j+dj]==BLACK_SQ: 
       if DEBUG:
         print("Destination is vacant, so OK to make this move.")
       return True
    if DEBUG:
      print("Destination square already occupied:")
      print(state)
    return False

def coords_from_square_number(source):
    row = int((source-1)/4)
    col = 2*((source-1)%4) + (row+1)%2
    return (row, col)

def deltas_from_direction(direc):
    i = DIRECTIONS.index(direc)
    return [[1,-1],[1,1],[-1,-1],[-1,1]][i]

class StateTransf():
  def __init__(self, source, direction):
    self.source = source
    self.direction = direction

  def __call__(self, state, role_number=FOX_ROLE):
    arr = state.toArray()
    (i,j) = coords_from_square_number(self.source)
    (di,dj) = deltas_from_direction(self.direction)
    news = state.__copy__()
    news.foxsTurn = not news.foxsTurn
    if news.foxCoords[0]==i and news.foxCoords[1]==j:
       news.foxCoords = [i+di, j+dj]
       return news
    for gp in news.coordsOfGeese:
       if gp[0]==i and gp[1]==j:
          gp[0] = i+di; gp[1] = j+dj
    return news


def goal_test(s):

    foxrow,foxcol = s.foxCoords
    if foxrow==7:
      print("The Fox wins!")
      return True

    # Now test whether the geese have won...
    # Count the number of moves for fox.
    arr = s.toArray()
    n_moves_for_fox = 0    
    for d in DIRECTIONS:
        drow,dcol = deltas_from_direction(d)
        newrow = foxrow+drow
        newcol = foxcol+dcol
        if newrow < 0: continue
        if newrow > 7: continue
        if newcol < 0: continue
        if newcol > 7: continue
        if arr[newrow][newcol]==GOOSE: continue
        return False  # Fox still has a move; game not over.

    print("The Geese win!")
    return True

    # There is one more case that we are not testing for yet:
    # That is when the geese have no move, but the fox has not
    # yet reached row 7.


def goal_message(s):
  return "Game Over."

class Operator:
  def __init__(self, name, precond, state_transf):
    self.name = name
    self.precond = precond
    self.state_transf = state_transf

  def is_applicable(self, s, role_number=FOX_ROLE):
    return self.precond(s, role_number=role_number)

  def apply(self, s):
    return self.state_transf(s)
#</COMMON_CODE>

#<INITIAL_STATE>
INITIAL_STATE = State([0,3],[[7,0],[7,2],[7,4],[7,6]],False)
print(INITIAL_STATE)
#</INITIAL_STATE>

#<ROLES>
ROLES = [ {'name': 'Fox', 'min': 1, 'max': 10},
          {'name': 'Geese', 'min': 1, 'max': 10}]
#          {'name': 'Observer', 'min': 0, 'max': 25}]
#</ROLES>
#<OPERATORS>
SOURCES = list(range(1,33))
DIRECTIONS = ['SW', 'SE', 'NW', 'NE']

OPERATORS = [Operator(
  "Move piece at "+str(source)+" in direction "+direc,
  Precondition(source, direc),
  StateTransf(source, direc))\
     for source in SOURCES for direc in DIRECTIONS]

if DEBUG:
  for o in OPERATORS:
    print(o.name)

#</OPERATORS>

#<GOAL_TEST> (optional)
GOAL_TEST = lambda s: goal_test(s)
#</GOAL_TEST>

#<GOAL_MESSAGE_FUNCTION> (optional)
GOAL_MESSAGE_FUNCTION = lambda s: goal_message(s)
#</GOAL_MESSAGE_FUNCTION>

#<STATE_VIS>
BRIFL_SVG = True # The program FoxAndGeese_SVG_VIS_FOR_BRIFL.py is available
render_state = None
def use_BRIFL_SVG():
  global render_state
  from  FoxAndGeese_SVG_VIS_FOR_BRIFL import render_state
#</STATE_VIS>

def test():
  for n in SOURCES:
    i,j = coords_from_square_number(n)
    print("Coords of square "+str(n)+" are row "+str(i)+"; col "+str(j))

  for d in DIRECTIONS:
    di, dj = deltas_from_direction(d)
    print("Direction: "+d+"; di = "+str(di)+"; dj = "+str(dj))

#test()
