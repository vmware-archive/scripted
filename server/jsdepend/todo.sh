#!/bin/bash
#command to find 'TODO' markers
grep --exclude=todo.sh --exclude-dir=node_modules --exclude-dir=test-resources -r -i TODO .
