const express = require('express'),
    app     = express(),
    port    = parseInt(process.env.PORT, 10) || 8080;

app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies

/*config CORS*/
app.use((req, res, next) => {
    const origin = req.get('origin');

    console.log(origin);

    //TODO - figure out what origin should be and block all others
    res.header('Access-Control-Allow-Origin', origin);
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
let profiles = require('./routes/profiles/profiles');
let server = require('./routes/server/server');
let settings = require('./routes/settings/settings');
tasks(app); profiles(app); server(app); settings(app);

app.listen(port);

console.log(`Nebula server started on port ${port}`);