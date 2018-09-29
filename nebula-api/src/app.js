// This is to load in environment variables from the .env file
const dotenv = require('dotenv');
const nebulaenv = require('./utils/env');
dotenv.load();

nebulaenv.setupEnvironment();

const cors = require('cors');

const express = require('express'),
    app     = express(),
    port    = parseInt(process.env.PORT, 10) || 8080;

app.use(cors());
app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded({extended: true})); // to support URL-encoded bodies

/*SETUP ROUTES*/
let tasks = require('./routes/tasks/tasks');
// let shopify = require('./routes/core/shopify/main');
// let harvester = require('./routes/core/shopify/harvester');
let profiles = require('./routes/profiles/profiles');
let server = require('./routes/server/server');
let settings = require('./routes/settings/settings');
let getUser = require('./routes/user/getUser');
let createUser = require('./routes/user/createUser');
let auth = require('./routes/auth/auth');

// wrap the app
tasks(app); profiles(app);
server(app); settings(app);
createUser(app); getUser(app);
auth(app);

app.listen(port, () => console.log(`Nebula API started on port ${port}`));

