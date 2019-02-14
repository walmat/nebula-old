#!/bin/bash

# Get the root directory of the project
ROOT_DIR="$(git rev-parse --show-toplevel)"

# Go into the frontend project
cd "$ROOT_DIR/packages/frontend"

# Compile Sass

# Right now we're just adding file manually, but eventually
# We should figure out a way to recursively do this
./node_modules/.bin/sass --no-source-map src/tasks/tasks.scss src/tasks/tasks.css
./node_modules/.bin/sass --no-source-map src/server/server.scss src/server/server.css
./node_modules/.bin/sass --no-source-map src/app.scss src/app.css
