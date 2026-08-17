@echo off
setlocal
cd /d "%~dp0"
set "PROFILE=%~dp0webview-profile"
if not exist "%PROFILE%" mkdir "%PROFILE%"
set "CACHE=%RANDOM%%RANDOM%"
start "MiniKyumons V1.1" msedge.exe --app="file:///%~dp0index.html?v=%CACHE%" --disable-cache --user-data-dir="%PROFILE%" --window-size=585,427
endlocal
