#!/bin/bash

# Get the root directory of the project
ROOT_DIR="$(git rev-parse --show-toplevel)"

# Go into the frontend project
cd "$ROOT_DIR/frontend"

# Compile Sass

# Right now we're just adding file manually, but eventually
# We should figure out a way to recursively do this
./node_modules/.bin/sass src/tasks/tasks.scss src/tasks/tasks.css
