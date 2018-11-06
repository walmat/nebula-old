/**
 * Utils includes
 */
const {
    formatProxy,
    userAgent,
    request,
} = require('./utils');

class Account {
    constructor(context, timer) {
        this._context = context;
        this._task = this._context.task;
        this._proxy = this._context.proxy;
        this._aborted = this._context.aborted;
        this._timer = timer;

        this.ACCOUNT_STATES = {
            LoggedIn: 'LOGGED_IN',
            LoggedOut: 'LOGGED_OUT',
        }
    }

    /**
     * login to the account given to us by the user
     */
    login() {

        return request({
            uri: `${this._task.site.url}/account/login`,
            method: 'post',
            simple: true,
            followAllRedirects: true,
            proxy: formatProxy(this._proxy),
            resolveWithFullResponse: true,
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
                return this.ACCOUNT_STATES.LoggedOut;
            }
            console.log('[INFO]: ACCOUNT: Logged in! Proceeding to add to cart')
            return this.ACCOUNT_STATES.LoggedIn;
        })
        .catch((err) => {
            return {
                errors: err,
            }
        });
    }

    logout() {

        return request({
            uri: `${this._task.site.url}/account/logout`,
            method: 'get',
            proxy: formatProxy(this._proxy),
            followAllRedirects: true,
            resolveWithFullResponse: true,
            headers: {
                'User-Agent': userAgent,
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                Referer: `${this._task.site.url}/account/`
            },
        })
        .then((res) => {
            if (res.request.href === `${this._task.site.url}/`) {
                console.log('[DEBUG]: ACCOUNT: Successfully logged out!');
                return this.ACCOUNT_STATES.LoggedOut;
            }
            return this.ACCOUNT_STATES.LoggedIn;
        })
        .catch((err) => {
            return {
                errors: err,
            }
        });
    }
}
module.exports = Account;