class Token() {

    constructor(token, timestamp, host, sitekey) {
        this._token = token;
        this._timestamp = timestamp;
        this._host = host;
        this._sitekey = sitekey;
    }

    /**
     * getter for `token`
     */
    getToken() {
        return this._token;
    }
    /**
     * setter for `token`
     * @param {String} token - token to set for the Token Object
     */
    setToken(token) {
        this._token = token;
    }

    /**
     * getter for `timestamp`
     */
    getTimestamp() {
        return this._timestamp;
    }
    /**
     * setter for `timestamp`
     * @param {String} timestamp - timestamp to set for the Token Object
     */
    setTimestamp(timestamp) {
        this._timestamp = timestamp;
    }

    /**
     * getter for `host`
     */
    getHost() {
        return this._host;
    }
    /**
     * setter for `host`
     * @param {String} host - host to set for the Token Object
     */
    setHost(host) {
        this._host = host;
    }

    /**
     * getter for `sitekey`
     */
    getSitekey() {
        return this._sitekey;
    }
    /**
     * setter for `sitekey`
     * @param {String} sitekey - sitekey to set for the Token Object
     */
    setSitekey(sitekey) {
        this._sitekey = sitekey;
    }
}
module.exports = Token;