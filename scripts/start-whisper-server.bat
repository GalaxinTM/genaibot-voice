@echo off
cd ..
.\whisper.cpp\build\bin\Release\whisper-server.exe --model .\whisper.cpp\models\ggml-small.en.bin --port 4000 --host 127.0.0.1
