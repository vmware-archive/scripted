@echo off
setlocal enableDelayedExpansion

set thisdir=%~dp0
pushd..
cd %thisdir%..
set rootdir=%cd%
popd

rem taskkill /F /IM "node.exe" > killed.log 2>&1

echo =================================================== >> scripted.log
echo launching node again: %DATE% %TIME% >> scripted.log

set arg=%1
set identifiers=%arg:~1,2%

IF %identifiers% EQU :\ (
set patharg=%1
) ELSE (
set patharg=%cd%\%1
)

set patharg=%patharg:\=/%
set "patharg=!patharg: =%%20!"

echo Starting scripted.js... >> scripted.log

start node-inspector &

start /MIN cmd /c node --debug-brk %rootdir%\server\scripted.js^>^>scripted.log

start http://127.0.0.1:8080/debug?port=5858

start http://localhost:7261/editor.html?%patharg%
