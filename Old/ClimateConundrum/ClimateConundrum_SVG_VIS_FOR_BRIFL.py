# Author:  S. Tanimoto
# Purpose: provide SVG graphics for the Climate Conundrum BRIFL program.
# Created: 2017
# Python version 3.x

import svgwrite
from ClimateConundrum import *

DEBUG = False

# The following control the layout of the state displays.
MARGIN = 10

DISPLAY_HEIGHT = 650
DISPLAY_WIDTH  = 500

IMAGE_WIDTH = IMAGE_HEIGHT = 400 # for the image of the Earth
IMAGE_Y = 50
IM = None # Make this a global so it will only be loaded once per session.

DWG = None # It's global only for consistency with other problem formulations
  # where it makes more of a difference.

def render_state(state):
    global DWG
    session = get_session() # Need HOST and PORT info for accessing images.
    DWG = svgwrite.Drawing(filename = "test-svgwrite.svg",
        id = "state_svg",  # Must match the id in the html template.
        size = (str(DISPLAY_WIDTH)+"px", str(DISPLAY_HEIGHT)+"px"),
        debug=True)
        # Making debug=True enables svgwrite to validate the SVG.
    
    # draw background rectangle
    DWG.add(DWG.rect(insert = (0,0),
        size = (str(DISPLAY_WIDTH)+"px", str(DISPLAY_HEIGHT)+"px"),
        stroke_width = 5,
        fill = color_of_heat(state))) # color shows the heat of the earth

    global IM, IMAGE_HEIGHT, IMAGE_WIDTH
    if not IM:
        x = (DISPLAY_WIDTH - IMAGE_WIDTH)/2
        y = IMAGE_Y
        filename = "Earth1.jpg"
        url = "http://"+session['HOST']+":"+str(session['PORT'])+"/get_image/"+filename
        IM = DWG.image(url,
                       insert=(x,y), size=(IMAGE_WIDTH, IMAGE_HEIGHT))
        #BIG_EARTH = "Earth1.jpg" # from http://mightyearth.net/

    DWG.add(IM)
    x = DISPLAY_WIDTH/2
    y = 35
    title = DWG.text("The World in "+str(state.year), insert=(x,y),
                     stroke="black", font_size=30,
                     text_anchor="middle", alignment_baseline="middle")
    DWG.add(title)

    info_strings = ["T="+"%.5f" % state.T,
        "(average surface temperature, in deg. Centigrade)",
        "albedo = %.5f" % state.a + "; emissivity = %.5f" % state.e + ";",
        "albedo_change_factor = %.5f" % state.albedo_change_factor + ";",
        "emissivity_change_factor = %.5f" % state.emissivity_change_factor +";",
        "Funds remaining: $" + str(state.funds)+ " M."]
    y0 = IMAGE_HEIGHT + IMAGE_Y + 30
    for (ypos, t) in enumerate(info_strings):
        txt = DWG.text(t, insert=(x, y0+ypos*30))
        txt.update({'stroke':"black", 'font_size':20,
                     'text_anchor':"middle", 'alignment_baseline':"middle"})
        DWG.add(txt)

    if DEBUG:
        print(DWG.tostring())
        DWG.save()

    return (DWG.tostring())

def color_of_heat(state):
    T = state.T
    level = min(max(0, (T-12)*32.0), 255)
    r = level
    g = 64
    b = 255 - level
    return "rgb("+str(int(r))+","+str(int(g))+","+str(int(b))+")"

def create_initial_image_state():
    print("In create_initial_image_state.")
    global IM
    IM = PIL.Image.open(BIG_EARTH)
    IM.thumbnail((IMAGE_WIDTH,IMAGE_HEIGHT))
    
    TStar.State.number = 0
    initialStateData = CC_State_Data(a=0.3, e=0.612, T=15, year=2015,
                                     funds=200, n=0)
    initialStateData.updateT() # make the temperature value consistent.
    TStar.INITIAL_STATE = \
      TStar.State(initialStateData,None,None)
    print("Leaving create_initial_image_state.")


if __name__ == '__main__':
    DEBUG = True
    s = INITIAL_STATE
    render_state(s)
        
