## Frontend
----
The frontend code is setup as a standard Electron app. All of the main process code is held within the [lib](./lib) directory, while all the renderer code is held either in [public](./public) or [src](./src).

### Getting Started
----
In order for the frontend app to work, you must've previously built the `task-runner` package, as it's a dependency of the frontend. If you haven't done so, go ahead and go do so (assuming your inside of the frontend directory):
```js
cd ../task-runner && yarn build
```

Once that is done, we may launch the development hot-reload server by running
```js
yarn dev-server
```

Once the server is up and running (usually on port 3000), launch the frontend in development mode by running
```js
yarn dev
```
The Electron app should should launch two windows: The launcher and the main window. The launcher window is a hidden background window that is used as an adapter for all the IPC between the main window and the task package. More on that later.

### Code Structure
----
The code is structured in a pretty simplistic way. As mentioned before, all of the main process code is held within the [lib](./lib) directory, while all the renderer code is held either in [public](./public) or [src](./src). Let's go further in depth into these.

### Public
The html files in the public folder are specific to their respective window. The `index.html` file corresponds to the main window, and this window is rendered using React. Every other file is rendered in commonJS and does not utilize React.

## Src
This folder is split up into pretty clear counterparts (listed below):

**Constants**: Any app constants that are used globally. Eventually this folder should be moved to the API and served from there.
**Navbar**: Handles routing and also has a couple buttons to launch/close captcha harvesters 
**Profiles**: Handles creating, cloning, editing, and deleting billing profiles
**Server**: Handles creating proxies through AWS. You can view and shut them down through this page as well
**Settings**: Handles inputting custom proxies, webhooks, accounts, and shipping rates. You may also export and import the app state from here as well
**State**: All code related to redux. Split up into it's respective redux parts: *actions*, *middleware*, *reducers*, and even a custom *migrators* which helps us migrate from state to state if an existing value needs changed. As well, each counterpart is split up into it's page folder to help clarify it a bit more
**Tasks**: Handles creating tasks, viewing existing tasks, as well as running/stopping/destroying tasks
**Utils**: Contains all prop-type definitions, state redactions, global styles, validation, and more!


### Production
Create react app gives us access to react-scripts, which allows us to build the app by running `yarn build`. This will minify the `src` folder and copy the `public` folder to a new folder called `build`. After this process is done, the build folder will also run through the custom javascript-obfuscator and be copied into a new folder called `dist`. This is the folder that gets bundled together with the packaged application (explained later).

To run the app in production mode, simply run:
```js
yarn start
```
Which will launch the application in a production environment. (Note: this will require authentication with a valid license key).

### Packaging / Distribution
Packaging the app starts with making sure that all dependencies are installed and up to date. I usually guarantee this by running (from the root directory):
```js
yarn install --force
```
which will force a refresh of the installed packages, as well as install any missing packages. Once this process finishes, make sure the task-runner package is current as well (assuming you're inside of the task-runner folder):
```js
yarn build
```
Once these two processes finish, we can begin to actually package the application. Navigate to the frontend folder, and run:

```js
yarn run publish
```
This will start the [electron-builder]() process. There are a couple caveats here:
1. You cannot package for macOS on a Windows/Linux machine. This is due to a specific code signing being needed specifically for macOS.
2. You also **must** wait for the blockmaps to finish building in order to release that specific version. The blockmap generates a UUID that is specific to that build that has to coincide with that package app. Auto-update will fail if these UUIDs do not match (for security reasons).

Once the app has successfully been packaged, we can upload the release to [a new tagged release on github](https://github.com/walmat/nebula/releases). This is important for the auto-updater to work properly, as it compares the blockmap of the previous version with the currently built version.
