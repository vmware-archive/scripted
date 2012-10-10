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
IF "%arg%" EQU "." (
set patharg=%cd%\
) ELSE (
	set identifiers=%arg:~1,2%
	IF DEFINED identifiers (
		IF "%identifiers%" EQU ":\" (
			set patharg=%1
		) ELSE (
			set patharg=%cd%\%1
		)
	) ELSE (
		set patharg=%cd%\
	)
)

set patharg=%patharg:\=/%
set "patharg=!patharg: =%%20!"

echo Starting scripted.js... >> scripted.log

start /MIN cmd /c node %rootdir%\server\scripted.js^>^>scripted.log

start "" "http://localhost:7261/editor.html?%patharg%"
