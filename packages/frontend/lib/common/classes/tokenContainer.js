class TokenContainer {
  constructor(token, timestamp, host, sitekey) {
    this._token = token;
    this._timestamp = timestamp;
    this._host = host;
    this._sitekey = sitekey;
  }
}
module.exports = TokenContainer;
