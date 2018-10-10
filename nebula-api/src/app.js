// This is to load in environment variables from the .env file
const dotenv = require('dotenv');
const nebulaenv = require('./utils/env');
dotenv.load();

nebulaenv.setUpEnvironment();

const cors = require('cors');

const express = require('express'),
    app     = express(),
    port    = parseInt(process.env.PORT, 10) || 8080;

app.use(cors());
app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded({extended: true})); // to support URL-encoded bodies

/*SETUP ROUTES*/
let auth = require('./routes/auth/auth');
let discord = require('./routes/auth/discord');

// wrap the app
auth(app); discord(app);

app.listen(port, () => console.log(`Nebula API started on port ${port}`));

