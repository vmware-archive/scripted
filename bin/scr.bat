@echo off
setlocal enabledelayedexpansion

set thisdir=%~dp0
pushd..
cd /d %thisdir%..
set rootdir=%cd%
popd

set arg=%1
set restart="no"

if "!arg!" EQU "-r" (
	set restart="yes"
)

if "!arg!" EQU "--restart" (
	set restart="yes"
)

if !restart! EQU "yes" (
	echo Restarting node process
	taskkill /F /IM "node.exe" 
)

CALL :APPEND_MESSAGE =================================================== 2>NUL
CALL :APPEND_MESSAGE launching node again: %DATE% %TIME% 2>NUL


rem echo %arg%
rem Using ! rather than % copes with spaces in the arg
IF !arg! EQU "." (
set patharg=%cd%\
) ELSE (
	rem remove any double quotes before looking further, they may be there to
	rem allow for spaces in the file path
	set arg=%arg:"=%
    set leadingchar=!arg:~0,1!
	IF DEFINED leadingchar (
		IF "!leadingchar!" EQU "\" (
			set patharg=%cd:~0,2%%1
		) ELSE (
			set identifiers=!arg:~1,2!
			IF DEFINED identifiers (
				IF "!identifiers!" EQU ":\" (
					set patharg=!arg!
				) ELSE (
					set patharg=%cd%\%1
				)
			) ELSE (
				set patharg=%cd%\
			)
		)
	)
)
rem echo "patharg is '%patharg%'"

set patharg=%patharg:\=/%
set "patharg=!patharg: =%%20!"

call :LAUNCH_NODE 2>NUL

if !restart! EQU "yes" (
  GOTO :EOF
)

start "" %SCRIPTED_BROWSER% "http://localhost:7261/editor/%patharg%"

GOTO :EOF

:APPEND_MESSAGE 
	echo %* >> %TEMP%\scripted.log
	EXIT /B
	
:LAUNCH_NODE
	rem /B on start - Start application without creating a new window
	start /B /MIN cmd /c node "%rootdir%\server\scripted.js" >> %TEMP%\scripted.log 2>&1
	EXIT /B

:EOF
