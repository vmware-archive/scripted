@echo off
setlocal enabledelayedexpansion

set thisdir=%~dp0
pushd..
cd /d %thisdir%..
set rootdir=%cd%
popd

rem taskkill /F /IM "node.exe" > killed.log 2>&1

echo =================================================== >> %TEMP%\scripted.log
echo launching node again: %DATE% %TIME% >> %TEMP%\scripted.log

set arg=%1
IF "%arg%" EQU "." (
set patharg=%cd%\
) ELSE (
        set leadingchar=%arg:~0,1%
	IF DEFINED leadingchar (
		IF "!leadingchar!" EQU "\" (
			set patharg=%cd:~0,2%%1
		) ELSE (
			set identifiers=%arg:~1,2%
			IF DEFINED identifiers (
				IF "!identifiers!" EQU ":\" (
					set patharg=%1
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

echo Starting scripted.js... >> %TEMP%\scripted.log

start /MIN cmd /c node "%rootdir%\server\scripted.js"^>^>%TEMP%\scripted.log

start "" %SCRIPTED_BROWSER% "http://localhost:7261/editor/%patharg%"
