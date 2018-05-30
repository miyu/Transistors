"""ClimateConundrum.py
   Being adapted for SOLUZION -- March 22, 2017.


   Each state will contain the following info, in a special object of class State:
       step_number -- basically the depth of this state's node in the tree.
          Used for several purposes, including evaluating the predicate
          isInitialState (True or False), used for preconditions of operators.
          Actually I should change this to Step number, so that I can use the first NParam steps for
          parameter input.  And then use the number to show "Turn number" which could map to
          years, starting in 2020, and going up by 5 years in each turn.
       albedo
       emissivity
       albedo_change_factor
       emissivity_change_factor
       funds = funds available.
   
       temperature  -- computed from other parameters.
       year -- in {2020, 2025, ..., 2100}

   INITIAL STATE:
       step number = 0
       albedo = starting value of albedo
       emissivity = starting value.
       temperature is computed.
       albedo_change_factor     -- set for slightly unstable temp (rising)
       emissivity_change_factor -- "    "     "        "

       funds = 200 (millions of dollars)

    VIS: Earth image with (a) numerical values, (b) color enhancement for temp.
    
    
   The available operators are the following.

      Invest in solar power.
      Reduce Auto emissions
      Invest in reforestation
      Implement policies (proceeds for 5 years).
         Funds increase by 100 M.

"""

#<METADATA>
SOLUZION_VERSION = "2.0"
PROBLEM_NAME = "Climate Conundrum"
PROBLEM_VERSION = "2.0"
PROBLEM_AUTHORS = ['S. Tanimoto']
PROBLEM_CREATION_DATE = "16-April-2017"

# The following field is mainly for the human solver, via either the Text_SOLUZION_Client.
# or the SVG graphics client.
PROBLEM_DESC=\
 '''The <b>"Climate Conundrum"</b> problem is manage the average surface
temperature of Earth over a 50-year period, such that it avoids rising
more than 3 degrees Centigrade.  The problem uses a simple but
standard climate model enhanced with some very simplied means of
changing the values of albedo and emissivity of the earth.
'''
#</METADATA>

#<COMMON_DATA>
# Some globals used for conveniently describing the states
# and operations:

'S = solar constant = watts/area = 1367 W / m^2'
S = 1367

'r = earth radius (about 6.371 million meters)'
r = 6.371

'sigma = Stefan-Boltzmann constant (about 5.67 E-8 J K^-4 m^-2 s^-1 )'
sigma = 5.67E-8

# Factoring out pi r^2, we have (1 - a)S = 4 e sigma T^4  (for T in Kelvin)

# Parameters that directly affect the initial state of the problem:
'epsilon = effective emissivity of earth (about 0.612)'
EMISSIVITY = 0.613     #  called e in the formulas.
ALBEDO = 0.305         #  called a in the formulas

BEGINING_EMISSIVITY_CHANGE_FACTOR = 0.995
BEGINING_ALBEDO_CHANGE_FACTOR     = 0.995

BEGINNING_FUNDS = 200 # millions of dollars.

#</COMMON_DATA>

#<COMMON_CODE>
import math
class State:
  def __init__(self, a=ALBEDO, e=EMISSIVITY, T=15.0, n=0, year=2020, funds=BEGINNING_FUNDS):
    self.a=a; self.e=e; self.T=T; self.stepNumber = n
    self.da1 = 0.0; self.de1=0.0
    self.da2 = 0.0; self.de2=0.0
    self.year=year; self.funds = funds
    self.emissivity_change_factor = BEGINING_EMISSIVITY_CHANGE_FACTOR
    self.albedo_change_factor = BEGINING_ALBEDO_CHANGE_FACTOR

  def __copy__(self):
    news = State()

    news.a = self.a; news.e=self.e; news.T=self.T; news.stepNumber=self.stepNumber

    news.year=self.year; news.funds=self.funds
    news.albedo_change_factor = self.albedo_change_factor
    news.emissivity_change_factor = self.emissivity_change_factor

    return news

  def __str__(self):
    # Produces a textual description of a state.
    # Might not be needed in normal operation with GUIs.
    return "Year: "+self.toStr1()+"; "+self.toStr2()+"; "+self.toStr3() + ";\n" + self.toStr4()
               
  def setStepNumber(self, newNumber):
    self.stepNumber = newNumber
  def nextStep(self):
    self.setStepNumber(1 + self.stepNumber)
  '''
  def setDeltaA1(self, da):
    self.da1 = da
  def setDeltaE1(self, de):
    self.de1 = de
  def setDeltaA2(self, da):
    self.da2 = da
  def setDeltaE2(self, de):
    self.de2 = de
  def updateAE(self, da, de):
    self.a = self.a + da
    self.e = self.e + de
'''
  def updateT(self):
    ''' This is used to make the value of T consistent with the other parameters.
    It does not change anything else.'''
#    a = self.a * self.albedo_change_factor
#    self.albedo_change_factor = a
#    e = self.e * self.emissivity_change_factor
#    self.emissivity_change_factor = e


    global sigma, S
    a = self.a; e = self.e
    #T = 15  # Expected value near start of simulation
    T4 = (1.0 - a) * S / (4.0 * e * sigma)
    if T4 < 0:
      print("Bad parameters in model, because T4 should never go negative.")
    print("In updateT, T4 = ", T4)
    T = math.pow(T4, 0.25)
    self.T = T - 273 # Convert from Kelvin to Celsius
    print("In updateT, T = ", self.T)
    
#   def copy_state_data(self, old):
#     '''After a new instance is created, this method can be used to copy all the
#      member values of an old instance over to the new instance.'''
#     self.a = old.a; self.e=old.e; self.T=old.T; self.stepNumber=old.stepNumber
# #    self.da1=old.da1; self.de1=old.de1; self.da2=old.da2
#     self.year=old.year; self.funds=old.funds
#     self.albedo_change_factor = old.albedo_change_factor
#     self.emissivity_change_factor = old.emissivity_change_factor

  def copy_state(self):
    news = State()
    news.copy_state_data(self)
    return news
  
  def toStr1(self):
    return str(self.year)
  def toStr2(self):
    return "a="+str(self.a)+"; e="+str(self.e)+"; T="+"%.3f" % self.T
  def toStr3(self):
    return "Funds left: "+str(self.funds)
  def toStr4(self):
    return "albedo_change_factor: "+str(self.albedo_change_factor) +\
      "; emissivity_change_factor: "+str(self.emissivity_change_factor)
  
'''
Here is the equation:


Energy from sun  = energy emitted by earth


(1 - a) S pi r^2 = 4 pi r^2 epsilon sigma T^4


where:
a = earth albedo (about 0.3)

S = solar constant = watts/area = 1367 W / m^2

r = earth radius (about 6.371 million meters)

epsilon = effective emissivity of earth (about 0.612)

sigma = Stefan-Boltzmann constant (about 5.67 E-8 J K^-4 m^-2 s^-1 )

T = equilibrium temperature of the earth (often to be found).

(See http://en.wikipedia.org/wiki/Climate_model )

'''

SOLAR_COST = 150
REDUCE_AUTO_COST = 80
REFOREST_COST = 50
INCOME = 100

def f_Solar(s):
  print("Investing in Solar energy.")
  s2=s.__copy__()
  global SOLAR_COST
  s2.funds -= SOLAR_COST
  s2.emissivity_change_factor *= 1.003 # This reduces the rate of accumulation of GG
  s2.lastOpDesc = "Inv. in Solar Energy"
  return s2

def f_Reduce_Auto(s):
  print("Reducing Automobile emissions.")
  s2=s.__copy__()
  global REDUCE_AUTO_COST
  s2.funds -= REDUCE_AUTO_COST
  s2.emissivity_change_factor *= 1.001 # This also reduces the rate of accumulation of GG
  s2.lastOpDesc = "Red. Auto. Emissions"
  return s2

def f_Reforest(s):
  print("Investing in reforestation.")
  s2=s.__copy__()
  global REFOREST_COST
  s2.funds -= REFOREST_COST
  s2.emissivity_change_factor *= 1.001 # nice improvement in rate of e, but albedo goes down.
  s2.albedo_change_factor *= 0.993 # forests have lower albedo than average.
  s2.lastOpDesc = "Inv. in reforestation"
  return s2

def f_Implement(s):
  print("Implementing selected policies.")
  s2=s.__copy__()
  # Next  update the albedo and emissivity. They must lie in the range [0.0 - 1.0].
  e_new = s2.e * s2.emissivity_change_factor  # Record effects of 5 more years of greenhouse gas accum.
  s2.e = min(1.0, e_new)
  a_new = s2.a * s2.albedo_change_factor      # Change happens if any reforestation was selected.
  s2.a = min(1.0, a_new)
  
  s2.year += 5
  s2.updateT()
  global INCOME
  s2.funds += INCOME # Pass Go, collect $100M
  s2.lastOpDesc = "Implement"
  return s2

def goal_test(s):
  '''If the year is greater than or equal to 2065 and the temperature is
  less than or equal to 18, then the goal has been reached.'''
  return s.year > 2064 and s.T <= 18

def goal_message(s):
  return "You managed to keep the world relatively cool. Congratulations!!!"

class Operator:
  def __init__(self, name, precondition, state_transf):
    self.name = name
    self.precondition = precondition
    self.state_transf = state_transf

  def is_applicable(self, s, role_number=0):
    return self.precondition(s, role_number)

  def apply(self, s):
    return self.state_transf(s)

  def __str__(self):
    return 'Operator('+o.name+'; '+str(o.precondition)+'; '+str(o.state_transf)+')'

# -- Beginning of code using write-back from server program.
SESSION = None
def get_session():
  return SESSION

#</COMMON_CODE>

#<INITIAL_STATE>
IM = None # Global image object storing the Earth image.
INITIAL_STATE =  State(a=ALBEDO, e=EMISSIVITY, T=15.0, n=0, year=2020, funds=BEGINNING_FUNDS)
#</INITIAL_STATE>

#<ROLES>
ROLES = [ {'name': 'Climate-Conundrum Player', 'min': 1, 'max': 10},
          {'name': 'Observer', 'min': 0, 'max': 25}]
#</ROLES>

#<OPERATORS>
op1 = Operator("Reduce Automobile Emissions (cost is "+str(REDUCE_AUTO_COST)+"M)",
               lambda s, role_number=0: s.funds>=REDUCE_AUTO_COST,
               f_Reduce_Auto)

op2 = Operator("Invest "+str(SOLAR_COST)+"M in Solar Generation",
               lambda s, role_number=0: s.funds>=SOLAR_COST,
               f_Solar)

op3 = Operator("Invest "+str(REFOREST_COST)+"M in Reforestation",
               lambda s, role_number=0: s.funds>=REFOREST_COST,
               f_Reforest)

op4 = Operator("Implement Selected Policies over 5 years",
               lambda s, role_number=0: True,
               f_Implement)
'''
op1 = Operator("Increase Albedo", lambda s: True, f1)

op2 = Operator("Increate Emissivity", lambda s: True, f2)

op3 = Operator("Commit resources for this 5-year period.", lambda s: True, f3)

op3 = OperatorSpecifiedWithDialog('Specify an integer freely',
                                lambda x,p=0,a=0:x,
                                #updateA,
                                #dof3,
                                #group="Dialog",
                                dialog_title="Number needed",
                                prompt="Type an integer:",
                                param_op_type="Int")

op4 = OperatorSpecifiedWithDialog('Specify a floating-point number freely',
                                updateA,
                                #group="Dialog",
                                dialog_title="Floating-point number needed",
                                prompt="Type a floating-point number:",
                                param_op_type="Float")
'''
OPERATORS = [op1, op2, op3, op4]
#for o in OPERATORS:
#  print(str(o))
#  print('')
#</OPERATORS>

#<GOAL_TEST> (optional)
GOAL_TEST = lambda s: goal_test(s)
#</GOAL_TEST>

#<GOAL_MESSAGE_FUNCTION> (optional)
GOAL_MESSAGE_FUNCTION = lambda s: goal_message(s)
#</GOAL_MESSAGE_FUNCTION>

#<STATE_VIS>
if 'BRYTHON' in globals():
 from ClimateConundrumVisForBrython import set_up_gui as set_up_user_interface
 from ClimateConundrumVisForBrython import render_state_svg_graphics as render_state
# if 'TKINTER' in globals(): from ClimateConundrumVisForTKINTER import set_up_gui

BRIFL_SVG = True # The program ClimateConundrum_SVG_VIS_FOR_BRIFL.py is available
render_state = None
def use_BRIFL_SVG():
  global render_state
  from  ClimateConundrum_SVG_VIS_FOR_BRIFL import render_state
  print("Leaving use_BRIFL_SVG in ClimateConundrum.py")
#</STATE_VIS>



