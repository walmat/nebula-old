const express = require('express'),
    app     = express(),
    port    = parseInt(process.env.PORT, 10) || 8080;

app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies

/*config CORS*/
app.use((req, res, next) => {
    const origin = req.get('origin');

    // TODO Add origin validation
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

let tasks = require('./routes/tasks');
tasks(app);
app.listen(port);

console.log(`Nebula server started on port ${port}`);