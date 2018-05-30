'''RockPaperScissors_SVG_VIS_FOR_BRIFL.py

Create SVG displays of states during a session with
the RockPaperScissors template in the BRIFL environment.


'''
DEBUG=True
import svgwrite

from RockPaperScissors import *

import math

board=statusline=opselect=None
DWG = None
PI=3.14159

VIS_WIDTH = 700
VIS_HEIGHT = 500
IMAGE_HEIGHT=100; IMAGE_WIDTH=100

def render_state(state):
  #print("In render_state, state="+str(state))
  #print("In render_state, SESSION="+str(SESSION))
  session = get_session() # Need HOST and PORT info for accessing images.

# set up the drawing object:
  global DWG
  DWG = svgwrite.Drawing(filename = "test-svgwrite.svg",
                           id = "state_svg",  # Must match the id in the html template.
                           size = (str(VIS_WIDTH)+"px", str(VIS_HEIGHT)+"px"),
                           debug=True)
    
  # draw background rectangle
  DWG.add(DWG.rect(insert = (0,0),
                     size = (str(VIS_WIDTH)+"px", str(VIS_HEIGHT)+"px"),
                     stroke_width = 5,
                     stroke = "black",
                     fill = "rgb(192, 192, 240)")) # sky blue?

  blunts_color = "#777777"
  wraps_color = "#4444ff"
  cuts_color = "#ff4444"


  # Draw a circle.
  xmid = VIS_WIDTH/2
  ymid = VIS_HEIGHT/2
  UNIT = 1
  circ = svgwrite.shapes.Circle(center=(xmid,ymid),r=VIS_HEIGHT/3,
                                        stroke= "#404000", fill="yellow",
                                        stroke_width=0.1,
                                        transform='scale('+str(UNIT)+')')
  DWG.add(circ)

  players = sorted(list(state.d.keys()))
  n = len(players)
  if n==0: n=1
  angle = 0.0
  angle_incr = (2*PI)/n
  r1 = VIS_HEIGHT * 0.46
  r2 = VIS_HEIGHT * 0.27
  scale_factor = 1
  if n > 5: scale_factor = 0.5
  if n > 10: scale_factor = 0.3
  strokewidth = 20
  attribs = {'font-size':24, 'text-anchor':'middle', 'alignment-baseline':'middle',
             'font-family':'Arial'}
  eccentricity = 1.15
  for i, player in enumerate(players):
    #print("Trying to draw player names on the screen. Player = "+player)
    cos_angle=math.cos(angle)
    sin_angle=math.sin(angle)
    xp = int( xmid + r1 * cos_angle * eccentricity) # horiz. adjust. to bias against occlusions.
    yp = int( ymid + r1 * sin_angle)
    rs_label=''
    if state.mode=="awaiting new round":
      ys = yp + 30
      try:
       rs = state.round_scores[player]
       if rs<0: rs_label = " "+str(rs)
       if rs>0: rs_label = " +"+str(rs)
       if rs==0: rs_label = " (=)"
       #text2 = DWG.text(rs_label, insert=(xp, ys))
       #text2.update(attribs)
       #DWG.add(text2)
      except Exception as e:
       print(e)
       import traceback
       traceback.print_exc()
    score = state.scores[player]
    text1 = DWG.text(player+rs_label+" ("+str(score)+")", insert=(xp, yp))
    text1.update(attribs)
    DWG.add(text1)

    weapon = state.d[player]
    if weapon < 3:
        x_icon = int( xmid + r2 * cos_angle)
        y_icon = int( ymid + r2 * sin_angle)
        filename = ['Rock','Paper','Scissors'][weapon]+'.png'
        #print("Image to use is: "+filename)
        url = "http://"+session['HOST']+":"+str(session['PORT'])+"/get_image/"+filename
        xw = x_icon-(IMAGE_WIDTH*scale_factor/2)
        yw = y_icon-(IMAGE_HEIGHT*scale_factor/2)
        w = IMAGE_WIDTH*scale_factor
        h = IMAGE_HEIGHT*scale_factor

        image = DWG.image(url, insert=(xw, yw), size=(w, h))
        DWG.add(image)

        color = ['red','blue','green'][weapon]
        small_circ = svgwrite.shapes.Circle(center=(x_icon,y_icon),r=(h/2)+(strokewidth*0.43),
                                        stroke= color, fill="none",
                                        stroke_width=strokewidth*scale_factor )#,
                                       # transform='scale('+str(scale_factor)+')')
        DWG.add(small_circ)
    angle += angle_incr

  if DEBUG: DWG.save()
  return DWG.tostring()

if __name__ == '__main__':
    DEBUG = True
    s = INITIAL_STATE
    render_state(s)
