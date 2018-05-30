# Author:  Michael Yu, Brian Chan
# Purpose: Visualization for Transistors
# Created: 2018
# Python version 3.x

import svgwrite

print("Importing SVG VIS")
from Transistors import GOAL_TEST

DEBUG = False
W = 600
H = 160

def render_state(s):
    dwg = svgwrite.Drawing(filename="test-svgwrite.svg",
                           id="state_svg",  # Must match the id in the html template.
                           size=(str(W) + "px", str(H) + "px"),
                           debug=True)

    dwg.add(dwg.rect(insert=(0, 0),
                     size=(str(W) + "px", str(H) + "px"),
                     stroke_width="1",
                     stroke="black",
                     fill="#CCCCCC"))

    if GOAL_TEST(s):
        dwg.add(dwg.text('You win!',
                         insert=(W / 2, H / 2),
                         text_anchor="middle",
                         font_size="25",
                         fill="brown"))

    return (dwg.tostring())
