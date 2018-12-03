/**
 * Utils includes
 */
const {
    formatProxy,
    userAgent,
} = require('./utils');

class Account {
    static get States() {
        return {
            LoggedIn: 'LOGGED_IN',
            LoggedOut: 'LOGGED_OUT',
        }
    }

    constructor(context, timer) {
        this._context = context;
        this._timer = timer;

        this._task = this._context.task;
        this._proxy = this._context.proxy;
        this._aborted = this._context.aborted;
        this._logger = this._context.logger;
    }

    /**
     * login to the account given to us by the user
     */
    login() {
        this._logger.verbose('Starting login request to %s ...', this._task.site.url);
        return this._request({
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
                return Account.States.LoggedOut
            }
            this._logger.info('Logged in! Proceeding to add to cart');
            return Account.States.LoggedIn;
        })
        .catch((err) => {
            this._logger.debug('ACCOUNT: Error logging in: %s', err);
            return {
                errors: err,
            }
        });
    }

    logout() {
        this._logger.verbose('Starting logout request to %s ...', this._task.site.url);
        return this._request({
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
                this._logger.info('Successfully logged out');
                return this.ACCOUNT_STATES.LoggedOut;
            }
            return this.ACCOUNT_STATES.LoggedIn;
        })
        .catch((err) => {
            this._logger.debug('ACCOUNT: Error logging out: %s', err);
            return {
                errors: err,
            }
        });
    }
}
module.exports = Account;