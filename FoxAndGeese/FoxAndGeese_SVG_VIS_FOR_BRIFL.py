# Author:  S. Tanimoto
# Purpose: test svgwrite with the new SOLUZION server and client
# Created: 2017
# Python version 3.x

import svgwrite
from FoxAndGeese import State, FOX, GOOSE, WHITE_SQ, BLACK_SQ

DEBUG = False
W = 320 # BOARD_WIDTH
SQW = W/8
HALF_SQW = SQW/2
THREE_QUARTER_SQW = 3*(HALF_SQW/2)

def render_state(s):

    if DEBUG: print("In FoxAndGeese_SVG_VIS_FOR_BRIFL.py, s = "+str(s))

    dwg = svgwrite.Drawing(filename = "test-svgwrite.svg",
                           id = "state_svg",  # Must match the id in the html template.
                           size = (str(W)+"px", str(W)+"px"),
                           debug=True)

    # Background rectangle...
    dwg.add(dwg.rect(insert = (0,0),
                     size = (str(W)+"px", str(W)+"px"),
                     stroke_width = "1",
                     stroke = "black",
                     fill = "rgb(200,200,200)")) # off-white

    # black squares, etc.
    arr = s.toArray()
    print("arr="+str(arr))
    y = 0
    for row in range(8):
        offset = (row+1) % 2
        x = (0 + offset) * SQW
        for j in range(4):
            col = j*2 + offset
            print("row="+str(row)+"; col="+str(col)+"; elt="+str(arr[row][col]))
            dwg.add(dwg.rect(insert = (x, y),
                     size = (str(SQW)+"px", str(SQW)+"px"),
                     stroke_width = "1",
                     stroke = "black",
                     fill = "rgb(32,32,32)")) # dark gray
            label = ['','','F','G'][arr[row][col]]
            dwg.add(dwg.text(label, insert = (x+HALF_SQW, y+THREE_QUARTER_SQW),
                     text_anchor="middle",
                     font_size="25",
                     fill = "red"))

            x += 2*SQW
        y += SQW


    # FoxAndGeese

    if DEBUG:
        print(dwg.tostring())
        dwg.save()

    return (dwg.tostring())


    
if __name__ == '__main__':
    DEBUG = True
    INITIAL_STATE = State([0,3],[[7,0],[7,2],[7,4],[7,6]],False)
    print(INITIAL_STATE)
    render_state(INITIAL_STATE)



