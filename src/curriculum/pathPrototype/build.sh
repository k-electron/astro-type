#!/bin/sh
# PROTOTYPE: rebuild path.json and index.html. $1 = SCOWL 2020.12.07 "final" folder.
set -e
cd "$(dirname "$0")"
python3 -I path.py "$1" > path.json
python3 -I -c "import sys; t=open('template.html').read(); d=open('path.json').read().replace('</', '<\\\\/'); open('index.html','w').write(t.replace('/*DATA*/', d))"
