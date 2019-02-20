#!/bin/bash

# Get the root directory of the project
ROOT_DIR="$(git rev-parse --show-toplevel)"

# Go into the frontend project
cd "$ROOT_DIR/packages/frontend"

# Compile Sass

# Right now we're just adding file manually, but eventually
# We should figure out a way to recursively do this
yarn sass src/tasks/tasks.scss src/tasks/tasks.css
yarn sass src/server/server.scss src/server/server.css
yarn sass src/navbar/navbar.scss src/navbar/navbar.css
yarn sass src/settings/settings.scss src/settings/settings.css
yarn sass src/profiles/profiles.scss src/profiles/profiles.css
yarn sass src/app.scss src/app.css
