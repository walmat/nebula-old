const fs = require('fs');
const https = require('https');
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
// eslint-disable-next-line import/no-extraneous-dependencies
const { protocol } = require('electron');

const nebulaEnv = require('./env');

nebulaEnv.setUpEnvironment();

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

    const rootDir = nebulaEnv.isDevelopment()
      ? path.join(__dirname, '../../public')
      : path.join(__dirname, '../../build');

    // initialize express app
    const app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use((req, res, next) => {
      // If the request if for any assets/styles/js requested, fetch it using the static file handler
      if (/\.(js|json|css|png|svg|icns|ico)$/.test(req.originalUrl)) {
        next();
        return;
      }
      // Redirect all other requests to the captcha html
      res.sendFile(path.join(rootDir, 'captcha.html'));
    });
    app.use(express.static(rootDir));
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
    const httpsOptions = {
      key: fs.readFileSync(path.join(__dirname, '../common/_keys/key.pem')),
      cert: fs.readFileSync(path.join(__dirname, '../common/_keys/cert.pem')),
    };
    this._server = https.createServer(httpsOptions, this._app).listen();
    this._port = this._server.address().port;
    this._app.set('port', this._port);
    // Setup the protocol interceptor
    protocol.interceptHttpProtocol('http', async (req, callback) => {
      if (!this._server || !req.url.startsWith('http://checkout.shopify.com')) {
        callback(req);
        return;
      }
      callback({
        ...req,
        url: req.url.replace('http://checkout.shopify.com', `https://127.0.0.1:${this._port}`),
      });
    });
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
    // Remove the protocol interceptor
    protocol.uninterceptProtocol('http');
    console.log('[INFO]: Captcha server stopped');
  }
}

module.exports = CaptchaServerManager;
