# Author:  S. Tanimoto
# Purpose: test svgwrite with the new SOLUZION server and client
# Created: 2017
# Python version 3.x

import svgwrite
from Missionaries import M, C, LEFT, RIGHT
#import random
#from datetime import datetime

DEBUG = False
W=600; H=200
BOAT_LENGTH_FRAC = 0.2  # fraction of overall width W
BOAT_HEIGHT_FRAC = 0.2  # fraction of overall height H

def render_state(s):
    global W,H,BOAT_LENGTH_FRAC, DEBUG

    if DEBUG: print("In Missionaries_SVG_VIS_FOR_BRIFL.py, s = "+str(s))

    dwg = svgwrite.Drawing(filename = "test-svgwrite.svg",
                           id = "state_svg",  # Must match the id in the html template.
                           size = (str(W)+"px", str(H)+"px"),
                           debug=True)

    # Background rectangle...
    dwg.add(dwg.rect(insert = (0,0),
                     size = (str(W)+"px", str(H)+"px"),
                     stroke_width = "1",
                     stroke = "black",
                     fill = "rgb(192, 150, 129)")) # tan

    # River in the middle (another rect.)
    dwg.add(dwg.rect(insert = (W*0.3,0),
                     size = (str(W*0.4)+"px", str(H)+"px"),
                     stroke_width = "1",
                     stroke = "black",
                     fill = "rgb(127, 150, 192)")) # turquoise

    # The boat
    boatX = 0.3*W
    boatY = H*(1-BOAT_HEIGHT_FRAC - 0.02)
    if (s.d['boat']): boatX=(0.7-BOAT_LENGTH_FRAC)*W
    dwg.add(dwg.rect(insert = (boatX,boatY),
                     size = (str(W*BOAT_LENGTH_FRAC)+"px", str(H*BOAT_HEIGHT_FRAC)+"px"),
                     stroke_width = "1",
                     stroke = "black",
                     fill = "rgb(192, 63, 63)")) # reddish
    dwg.add(dwg.text('B', insert = ((boatX+BOAT_LENGTH_FRAC*W/2),(boatY+BOAT_HEIGHT_FRAC*H/2)),
                     text_anchor="middle",
                     font_size="25",
                     fill = "white"))

    # Missionaries
    Ms = s.d['people'][M]
    for i in range(Ms[LEFT]):
        draw_person(dwg, M, LEFT, i)
    for i in range(Ms[RIGHT]):
        draw_person(dwg, M, RIGHT, i)
        
    # Cannibals
    Cs = s.d['people'][C]
    for i in range(Cs[LEFT]):
        draw_person(dwg, C, LEFT, i)
    for i in range(Cs[RIGHT]):
        draw_person(dwg, C, RIGHT, i)

    if DEBUG:
        print(dwg.tostring())
        dwg.save()

    return (dwg.tostring())

def draw_person(dwg, M_or_C, left_or_right, i):
    "Represent a person as a colored rectangle."
    global W, H
    box_width = W*0.08
    box_height = H*0.3
    x = 0+W*0.01
    if left_or_right: x+=W*0.70
    x += i*W*0.1
    if M_or_C==M: color='green'; y=H*0.1
    else: color='violet'; y= H*0.6
    dwg.add(dwg.rect(insert = (x,y),
                     size = (str(box_width)+"px", str(box_height)+"px"),
                     stroke_width = "1",
                     stroke = "black",
                     fill = color))
    text = "M"
    if M_or_C==C: text = "C"
    dwg.add(dwg.text(text, insert = (x+box_width/2,y+box_height/2),
                     text_anchor="middle",
                     font_size="25",
                     fill = "white"))

    
if __name__ == '__main__':
    DEBUG = True
    s = {"boat":0, "people":[ [2, 1],
                              [2, 1]]}
    render_state(s)



