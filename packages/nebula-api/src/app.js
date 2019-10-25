// This is to load in environment variables from the .env file
const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');

const nebulaenv = require('./utils/env');

dotenv.config();
nebulaenv.setUpEnvironment();

const app = express();
const port = parseInt(process.env.PORT, 10) || 8080;

app.use(cors());
app.use(express.json()); // to support JSON-encoded bodies
app.use(express.urlencoded({ extended: true })); // to support URL-encoded bodies

/* SETUP ROUTES */
const auth = require('./routes/auth/auth');
const discord = require('./routes/auth/discord');

// wrap the app
auth(app);
discord(app);

app.listen(port, () => console.log(`Nebula API started on port ${port}`));
