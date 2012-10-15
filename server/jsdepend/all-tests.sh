#!/bin/bash
echo nodeunit `find . -name '*-test.js'`
nodeunit `find . -name '*-test.js'`