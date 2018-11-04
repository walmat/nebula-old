/**
 * Parse includes
 */
const cheerio = require('cheerio');
const fs = require('fs');
const jar = require('request-promise').jar();
const rp = require('request-promise').defaults({
    timeout: 10000,
    jar: jar,
});

const Timer = require('./timer');
const now = require('performance-now');

/**
 * Utils includes
 */
const {
    formatProxy,
    userAgent,
} = require('./utils');

class Account {
    constructor(context) {
        this._context = context;
        this._task = this._context.task;
        this._proxy = this._context.proxy;
        this._aborted = this._context.aborted;
    }

    /**
     * login to the account given to us by the user
     */
    login() {
        rp({
            uri: `${this._task.site.url}/account/login`,
            method: 'post',
            followAllRedirects: true,
            proxy: formatProxy(this._proxy),
            resolveWithFullResponse: true,
            rejectUnauthorized: false,
            headers: {
                'User-Agent': userAgent,
                'Content-Type': 'application/x-www-form-urlencoded',
                Referer: `${this._task.site.url}/account/login`
            },
            formData: {
                'form_data': 'customer_login',
                'utf8': '✓',
                'customer[email]': this._task.username,
                'customer[password]': this._task.password,
            },
        })
        .then((res) => {
            if (res.request.href.indexOf('login') > -1) {
                return false;
            }
            console.log('[DEBUG]: ACCOUNT: Logged in! Generating alternative checkouts')
            return true;
        })
    }

    logout() {
        rp({
            uri: `${this._task.site.url}/account/logout`,
            method: 'get',
            followAllRedirects: true,
            resolveWithFullResponse: true,
            rejectUnauthorized: false,
            headers: {
                'User-Agent': userAgent,
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                Referer: `${this._task.site.url}/account/`
            },
        })
        .then((res) => {
            if (res.request.href === `${this._task.site.url}/`) {
                console.log('[DEBUG]: ACCOUNT: Successfully logged out!');
                return true;
            }
            return false;
        })
    }
}
module.exports = Account;