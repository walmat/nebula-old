// This is to load in environment variables from the .env file
const dotenv = require('dotenv');

dotenv.load();

// eslint-disable-next-line no-use-before-define
nebulaenv.setUpEnvironment();

const cors = require('cors');

const express = require('express');

const app = express();

const port = parseInt(process.env.PORT, 10) || 8080;
const nebulaenv = require('./utils/env');

app.use(cors());
app.use(express.json()); // to support JSON-encoded bodies
app.use(express.urlencoded({ extended: true })); // to support URL-encoded bodies

/* SETUP ROUTES */
const auth = require('./routes/auth/auth');
const discord = require('./routes/auth/discord');
const sites = require('../../nebula-api/src/routes/config/sites');

// wrap the app
auth(app);
discord(app);
sites(app);

app.listen(port, () => console.log(`Nebula API started on port ${port}`));
