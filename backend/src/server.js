const express = require('express');
const multer  = require('multer');
// const tasks = multer({ dest: 'tasks/' });
const app = express();
const port = process.env.PORT || 3030;
app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies

let route = require('./routes/test');
route(app);

app.listen(port);

console.log(`Nebula server started on port ${port}`);