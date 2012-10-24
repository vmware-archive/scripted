#!/bin/sh

#####################################################################
## A launcher for the scripted test suite                          ##
##                                                                 ##
## Must have phantomjs and scripted on your classpath              ##
#####################################################################

scr
phantomjs runner.js http://localhost:7261/scripts/js-tests/allScriptedClientTests.html
killserver
