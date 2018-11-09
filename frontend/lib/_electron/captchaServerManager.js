const http = require('http');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');

class CaptchaServerManager {
  constructor(context) {
    /**
     * Application context.
     * @type {App}
     */
    this._context = context;

    /**
     * Instance of Running Express Captcha Server
     * @type {express}
     */
    this._server = null;

    /**
     * Port on which the server is running
     * @type {number}
     */
    this._port = 0;

    // initialize express app
    const app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, '../../build')));
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../build/captcha.html'));
    });
    this._app = app;
  }

  get isRunning() {
    return !!this._server;
  }

  get port() {
    return this._port;
  }

  start() {
    if (this._server) {
      console.log(`[ERROR]: Captcha Server has already started on port: ${this._port}`);
      return;
    }
    this._server = http.createServer(this._app).listen();
    this._port = this._server.address().port;
    this._app.set('port', this._port);
    console.log(`[INFO]: Captcha Server started listening on port: ${this._port}`);
  }

  stop() {
    if (!this._server) {
      console.log('[WARN]: Captcha server is already not running!');
      return;
    }
    this._server.close();
    this._server = null;
    this._port = 0;
    console.log('[INFO]: Captcha server stopped');
  }
}

module.exports = CaptchaServerManager;
