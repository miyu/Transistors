import copy, os, sys, threading, time
transistors_py_path =  os.path.realpath(__file__)
transistors_dir_path = os.path.dirname(transistors_py_path)
sz001_path = os.path.join(transistors_dir_path, "../SZ001.py")
sys.path.append(os.path.abspath(sz001_path))

import SZ001
print(SZ001)

__init__():
def periodic():
    print(time.ctime())
    threading.Timer(10, periodic).start()

periodic()