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

Once that has finished, let's dive into the code structure in the packages

### Packages
-----
Due to the nature of monorepo structures, each package has it's own purpose.

#### Frontend
This package handles the bulk of the app. It's an [ElectronJS](https://electronjs.org) app that is structured using React, and Redux for state management. It utilizes SASS for styling and other than that is not too complex. To find out more about the Electron app specifically, view it's README [here](./packages/frontend/README.md).

#### Task
This package handles all code specific to running a task. This package is obfuscated before dsitribution and then moved to the `task-built` package. To find out more about this package, view it's README [here](./packages/task/README.md). 

#### Task (Built)
This package is just a syntactic sugar package and **should not** be directly worked on. The direct point of communication is handled in the require of the TaskManager in the `frontend/lib/task/adapter.js`. To find out more about this package, view it's README [here](./packages/task-built/README.md).