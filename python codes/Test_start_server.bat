@echo off
echo Starting backend server...
start cmd /k python "S:\DATAPERTH\Perth Log Job system\Clock_In_test\app\backend.py" %*

echo Starting frontend server...
start cmd /k python -m http.server 3004 --bind 10.0.0.80

pause