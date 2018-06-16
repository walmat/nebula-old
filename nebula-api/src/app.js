// This is to load in environment variables from the .env file
const dotenv = require('dotenv');
dotenv.load();

const express = require('express'),
    app     = express(),
    port    = parseInt(process.env.PORT, 10) || 8080;

app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies

app.use((req, res, next) => {
    const origin = req.get('origin');

    console.log(origin);

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');

    // intercept OPTIONS method
    if (req.method === 'OPTIONS') {
        res.sendStatus(204);
    } else {
        next();
    }
});

/*SETUP ROUTES*/
let tasks = require('./routes/tasks/tasks');
let shopify = require('./routes/core/shopify/main');
let harvester = require('./routes/core/shopify/harvester');
let profiles = require('./routes/profiles/profiles');
let server = require('./routes/server/server');
let settings = require('./routes/settings/settings');
let getUser = require('./routes/user/getUser');
let createUser = require('./routes/user/createUser');

// wrap the app
tasks(app); profiles(app);
server(app); settings(app);
createUser(app); getUser(app);
shopify(app); harvester(app);

app.listen(port);

console.log(`Nebula API server started on port ${port}`);