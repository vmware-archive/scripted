#!/bin/bash
echo nodeunit `find . -name '*-test.js'`
nodeunit `find -name test-resources -prune -o -name "*-test.js"`