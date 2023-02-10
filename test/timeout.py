"Simluate a server that times out clients."

import socket, time

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
print("Socket created")
s.bind(('localhost', 54321))
print("Socket binding to localhost:54321")
s.listen(5)
print("Socket listening")
try:
    while True:
        time.sleep(0)
except:
    s.close()
    print("Socket closed")
