README.TXT

The SOLUZION Multi-User Session Manager provides a framework
for implementing games and problem solving activities in
Python that will be used over the web.

A particular game or problem that works with this framework
will typically consist of one or more Python source-code files:
 -- a main formulation file, such as FoxAndGeese.py.
 -- a visualization method file, such as:
   FoxAndGeese_SVG_VIS_FOR_BRIFL.py

Additional files can be included, such as additional Python
files, image files for building visualizations of states in
games, and even Javascript code by making some modifications
to the index.html template file.

Here is the folder layout for a setup that includes four
game/problem formulations.  When you create a new game or
problem formulation, you should create a new folder within
SZ_ALPHA, and make it a sibling folder of Missionaries, etc.
You'll put your formulation files in that folder.

In order to run your formulation, you will need all three
files: SZ001.py, index.html, and socket.io.min.js in the
same folders that they are in to begin with.  You should
not have to modify any of these files.   The functionality
of the three files is as follows: SZ001.py establishes a
web server process (using the Flask library), loads in your
problem formulation, and then waits for a web browsers to
connect to it on whatever port you give it on the command
line.  It delivers a web page that allows users to sign in
and participate in game play or problem solving.
The file index.html in the templates folder provides most
of the html code for the web page that is served.  More
html code gets rendered by the jinja template engine,
and the page also gets dynamically changed by javascript
code that runs within the browsers of connected users.
The file socket.io.min.js is a Javascript library needed
by the browser in order to interact over web sockets
with the server.  Web sockets are an alternative to AJAX
technology for active communication between the server
and the browser webpage's Javascript process.

Here is the folder structure that needs to be kept in
the computer you use as a server (e.g., Nicto.cs.washington.edu).


SZ_ALPHA/
 SZ001.py
 templates/
   index.html
 static/
   socket.io.min.js

 Missionaries/
   Missionaries.py
   Missionaries_SVG_VIS_FOR_BRIFL.py

 FoxAndGeese/
   FoxAndGeese.py
   FoxAndGeese_SVG_VIS_FOR_BRIFL.py

 RockPaperScissors/
   RockPaperScissors.py
   RockPaperScissors_SVG_VIS_FOR_BRIFL.py
   Rock.png
   Paper.png
   Scissors.png

 ClimateConundrum/
   ClimateConundrum.py
   ClimateConundrum_SVG_VIS_FOR_BRIFL.py
   Earth1.jpg


If all is installed properly, including the various Python
modules required by SZ001.py, then you would typically
run the server for one problem formulation and one session
by first cd'ing into the folder of the problem formulation
(e.g. Missionaries)
and then, from that directory, issuing a Linux command such
as:

../SZ001.py Missionaries 5678

Here the ".." means that the program to run is in the parent
directory.  SZ001.py is the program to run, (and it has a
Python comment on the first line that Linux uses to know that
it should run the program in Python.  There are two command-
line arguments. The first "Missionaries" is the name of the
problem formulation to use.  This tells SZ001.py to import
this problem formulation and use it in the session.

The second argument, here 5678, is a port number for the
server to listen on for browser connection requests.
It is customary to use port numbers in the range 5000-5999
for this sort of project.  Numbers in this range are fairly
unlikely to conflict with standard services.  If several
teams are using SZ001.py at the same time, it is possible
that their port numbers could conflict.  However, you will
get a diagnostic message when you try to start SZ001 with
a port that is already in use.  Just change your port number
and try again.

