"""Transistors.py
   Being adapted for SOLUZION -- March 22, 2017.

   Various initial states are specified below.

   The available operators (for each cube) are the following.
       Rotate up
       Cycle right

   We've also supplied a BFS solver in Solver.py

"""
import copy, json, math, os, sys, threading, time

SZ001_is_game_in_progress = None
SZ001_socketio = None
SZ001_exec_command = None

# Defines
C_TICKS_PER_SECOND = 7
C_DT = 1.0 / C_TICKS_PER_SECOND
C_TRANSISTOR_FACTORY_BUILD_RATE = 5
C_RESEARCH_LAB_BUILD_RATE_FN = lambda x: 0.33 * math.log2(x + 1)

ST_TIME = "time"
ST_TRANSISTORS = "transistors"
ST_TRANSISTORS_TOTAL_BUILT = "transistors_total_built"
ST_COMPUTERS = "computers"
ST_COMPUTERS_TOTAL_BUILT = "computers_total_built"
ST_TRANSISTOR_FACTORIES = "transistor_factories"
ST_TRANSISTOR_FACTORIES_TOTAL_BUILT = "transistor_factories_total_built"

ST_RESEARCH_LABS = "research_labs"
ST_RESEARCH_LABS_TOTAL_BUILT = "research_labs_total_built"
ST_RESEARCH = "research"
ST_RESEARCH_TOTAL_BUILT = "research_total_built"

# filled later
OPERATORS = []

def periodic():
    # print("Periodic tick 100ms", time.ctime(), SZ001_is_game_in_progress(), SZ001_socketio, SZ001_exec_command)
    if SZ001_is_game_in_progress():
      SZ001_exec_command({'command': 1, 'username': 'game'}, True)
    threading.Timer(C_DT, periodic).start()

def setup(is_game_in_progress, socketio, exec_command):
  global SZ001_is_game_in_progress, SZ001_exec_command, SZ001_socketio
  SZ001_is_game_in_progress = is_game_in_progress
  SZ001_socketio = socketio
  SZ001_exec_command = exec_command
  periodic()

#<METADATA>
SOLUZION_VERSION = "2.0"
PROBLEM_NAME = "Transistors"
PROBLEM_VERSION = "2.0"
PROBLEM_AUTHORS = ['Michael Yu', 'Brian Chan']
PROBLEM_CREATION_DATE = "8-May-2018"

# The following field is mainly for the human solver, via either the Text_SOLUZION_Client.
# or the SVG graphics client.
PROBLEM_DESC=\
 '''The <b>"Transistors"</b> problem is to arrange 4 cubes in a stacked tower such that each
 of the vertical walls of the tower is of 4 different colors.
'''
#</METADATA>

#<COMMON_DATA>
#</COMMON_DATA>

#<COMMON_CODE>

class State():
  def __init__(self, data, operators):
    self.data = data
    self.operators = operators

  def __copy__(self):
    news = State(copy.deepcopy(self.data), self.operators)
    return news

  def __str__(self):
    ''' Produces a textual description of a state.
        Might not be needed in normal operation with GUIs.'''
    status = f"{math.floor(self.data[ST_TRANSISTORS])} transistors"

    if self.data[ST_COMPUTERS_TOTAL_BUILT] > 0:
      status += f", {math.floor(self.data[ST_COMPUTERS])} computers"

    if self.data[ST_TRANSISTOR_FACTORIES_TOTAL_BUILT] > 0:
      status += f", {math.floor(self.data[ST_TRANSISTOR_FACTORIES])} transistor factories"
      
    if self.data[ST_RESEARCH_LABS_TOTAL_BUILT] > 0:
      status += f", {math.floor(self.data[ST_RESEARCH_LABS])} labs"
      status += f", {math.floor(self.data[ST_RESEARCH])} research"

    status += f" | t={self.data[ST_TIME]:.1f}s"

    res = json.dumps({
      "status": status,
      "state": self.data,
      "opdescs": {o.special : o.describe(self) for o in self.operators}
    })

    return res

  def __eq__(self, s):
    return str(self) == str(s)

  def __hash__(self):
    return (self.__str__()).__hash__()

def goal_test(s):
  return False

def goal_message(s):
  return "Congratulations on transistors!"

class Operator:
  def __init__(self, special, name, apply_cb, cond_cb, desc_cb):
    self.special = special
    self.name = name
    self.transition_cb = apply_cb
    self.is_applicable_cb = cond_cb
    self.desc_cb = desc_cb

  def apply(self, s):
    return self.transition_cb(s)

  def is_applicable(self, s, role_number=0):
    return self.is_applicable_cb(s, role_number)

  def describe(self, s):
    return self.desc_cb(s)

#</COMMON_CODE>

#<INITIAL_STATE>
INITIAL_STATE = State({
  ST_TIME: 0,
  ST_TRANSISTORS: 0,
  ST_TRANSISTORS_TOTAL_BUILT: 0,
  ST_COMPUTERS: 0,
  ST_COMPUTERS_TOTAL_BUILT: 0,
  ST_TRANSISTOR_FACTORIES: 0,
  ST_TRANSISTOR_FACTORIES_TOTAL_BUILT: 0,
  ST_RESEARCH_LABS: 0,
  ST_RESEARCH_LABS_TOTAL_BUILT: 0,
  ST_RESEARCH: 0,
  ST_RESEARCH_TOTAL_BUILT: 0,
}, OPERATORS)
#</INITIAL_STATE>

#<ROLES>
ROLES = [ {'name': 'Player', 'min': 1, 'max': 10},
          {'name': 'Observer', 'min': 0, 'max': 25}]
#</ROLES>

#<OPERATORS>
def transition_do_nothing(s):
  return s.__copy__()

def transition_step_time(s):
  snew = s.__copy__()
  snew.data[ST_TIME] += C_DT
  snew.data[ST_TRANSISTORS] += snew.data[ST_TRANSISTOR_FACTORIES] * C_TRANSISTOR_FACTORY_BUILD_RATE * C_DT
  
  research_gain = C_RESEARCH_LAB_BUILD_RATE_FN(snew.data[ST_RESEARCH_LABS])
  snew.data[ST_RESEARCH] += research_gain
  snew.data[ST_RESEARCH_TOTAL_BUILT] += research_gain
  return snew

def apply_cost(snew, costs):
  for k, v in costs.items():
    snew.data[k] -= v
  return snew
  

def apply_yields(snew, yields):
  for k, v in yields.items():
    snew.data[k] += v
    ktot = k + '_total_built'
    if ktot in snew.data:
      snew.data[ktot] += 1
  return snew

def applicable_always(s, role):
  return True

def applicable_cost(costs):
  def inner(s, role):
    for k, v in costs.items():
      if s.data[k] < v:
        return False
    return True
  return inner

class OpFactory():
  def __init__(self, special, name):
    self.special = special
    self.name = name
    self._cond = lambda s, role: True
    self._apply = lambda s: s.__copy__()
    self._desc = lambda s: ""

  def purchase(self, cost, yields):
    ocond, oapply, odesc = self._cond, self._apply, self._desc
    costfn = cost if callable(cost) else lambda s: cost
    
    def newcond(s, role):
      if not ocond(s, role): return False
      snew = oapply(s)
      return applicable_cost(costfn(snew))(snew, role)

    def newapply(s):
      snew = oapply(s)
      return apply_yields(apply_cost(snew, costfn(snew)), yields)
      
    def newdesc(s):
      x = odesc(s)

      for k, v in yields.items():
        if x != "":
          x += "; "
        x += "YIELD " + str(v) + " " + k
      
      if not ocond(s, None): 
        x += "; UNAPPLICABLE"
        return x
      
      snew = oapply(s)
      costs = costfn(snew)

      for k, v in costs.items():
        if x != "":
          x += "; "
        x += "COST " + str(v) + " " + k
      return x

    self._cond, self._apply, self._desc = newcond, newapply, newdesc
    return self

  def build(self):
    return Operator(self.special, self.special + " " + self.name, self._apply, self._cond, self._desc)

OPERATORS.extend([
  Operator("__NOP", "__NOP Do Nothing", transition_do_nothing, applicable_always, lambda s: ""),
  Operator("__TIME_STEP", "__TIME_STEP Step Time", transition_step_time, applicable_always, lambda s: ""),
  OpFactory('!OA', 'Build Transistor').purchase({}, {ST_TRANSISTORS: 1}).build(),
  OpFactory('!OB', 'Build Computer').purchase({ST_TRANSISTORS: 10}, {ST_COMPUTERS: 1}).build(),
  OpFactory('!OC', 'Build Transistor Factory').purchase({ST_COMPUTERS: 5}, {ST_TRANSISTOR_FACTORIES: 1}).build(),
  OpFactory('!OD', 'Build Research Lab').purchase(
    lambda s: {ST_TRANSISTORS: 1000 * (2 ** s.data[ST_RESEARCH_LABS_TOTAL_BUILT])},
    {ST_RESEARCH_LABS: 1}).build()
])

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
  print ("Importing svg")
  from Transistors_SVG_VIS_FOR_BRIFL import render_state
#</STATE_VIS>
