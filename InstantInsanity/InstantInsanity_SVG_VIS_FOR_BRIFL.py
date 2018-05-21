# Author:  Michael Yu, Brian Chan
# Purpose: Visualization for Instant Insanity
# Created: 2018
# Python version 3.x

import svgwrite
from InstantInsanity import GOAL_TEST

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

    for i, cube in enumerate(s.d):
        CUBE_RENDER_SIZE = 40
        offsets_x = [1, 1, 1, 1, 0, 2]
        offsets_y = [0, 1, 2, 3, 2, 2]

        for j in range(len(cube)):
            color = {'r': '#FF0000', 'b': '#0000FF', 'y': '#FFFF00', 'w': '#FFFFFF', 'g': '#00FF00'}[cube[j]]

            dwg.add(dwg.rect(
                insert=(
                    offsets_x[j] * CUBE_RENDER_SIZE + 4 * CUBE_RENDER_SIZE * i,
                    offsets_y[j] * CUBE_RENDER_SIZE),
                size=("{}px".format(CUBE_RENDER_SIZE), "{}px".format(CUBE_RENDER_SIZE)),
                stroke_width="1",
                stroke="black",
                fill=color))

    if GOAL_TEST(s):
        dwg.add(dwg.text('You win!',
                         insert=(W / 2, H / 2),
                         text_anchor="middle",
                         font_size="25",
                         fill="brown"))

    return (dwg.tostring())

