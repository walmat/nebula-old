const express = require('express');
const app = express();
const port = process.env.PORT || 3030;

let route = require('./routes/test');
route(app);

app.listen(port);

console.log(`Nebula server started on port ${port}`);