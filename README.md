## NEBULA ORION
----
Since we're utilizing yarn workspaces and a monorepo structure, there is a bit of overhead to getting the app up and running.

### Getting Started
----
Upon first cloning the repository, go ahead and install all 
dependencies.

```js
yarn
```

If you receive errors revolving around obfuscation, feel free to ignore those as they are not crucial to the development environment.

Once that has finished, let's dive into the code structure in the packages

### Packages
-----
Due to the nature of monorepo structures, each package has it's own purpose.

#### Frontend
This package handles the bulk of the app. It's an [ElectronJS](https://electronjs.org) app that is structured using ReactJS and Redux for state management. It utilizes SASS for styling and other than that is not too complex. To find out more about the Electron app specifically, view it's README [here](./packages/frontend/README.md).

#### Task Runner
This package handles all code specific to running a task. This package is obfuscated before dsitribution and then moved to the `task-runner-built` package. To find out more about this package, view it's README [here](./packages/task-runner/README.md). 

#### Task Runner (Built)
This package is just a syntactic sugar package and **should not** be worked on. The direct point of communication is handled in the require of the TaskManager in the `frontend/lib/task/adapter.js`. To find out more about this package, view it's README [here](./packages/task-runner-built/README.md).

#### Nebula API
This package is the API (currently hosted on Heroku) that is used for auth and for a few other things. To find out more about this package, view it's README [here](./packages/nebula-api/README.md).
