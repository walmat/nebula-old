class HumanCheckout {
    async addToCart() {
        const {
          task: {
            site: { name },
            product: { variants, hash },
            monitorDelay,
          },
          proxy,
        } = this._context;
    
        try {
          const res = await this._request('/cart/add.js', {
            method: 'POST',
            headers: {
              'User-Agent': userAgent,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(addToCart(variants[0], name, hash)),
            agent: proxy ? new HttpsProxyAgent(proxy) : null,
          });
    
          const { status, headers } = res;
    
          const checkStatus = stateForError(
            { status },
            {
              message: 'Adding to cart',
              nextState: States.AddToCart,
            },
          );
    
          if (checkStatus) {
            return checkStatus;
          }
    
          const redirectUrl = headers.get('location');
          this._logger.silly('FRONTEND CHECKOUT: Add to cart redirect url: %s', redirectUrl);
    
          if (redirectUrl) {
            if (redirectUrl.indexOf('stock_problems') > -1) {
              return { message: 'Running for restocks', nextState: States.AddToCart };
            }
    
            if (redirectUrl.indexOf('password') > -1) {
              this._delayer = await waitForDelay(monitorDelay);
              return { message: 'Password page', nextState: States.AddToCart };
            }
    
            if (redirectUrl.indexOf('throttle') > -1) {
              return { message: 'Waiting in queue', nextState: States.PollQueue };
            }
          }
    
          const body = await res.text();
    
          if (/cannot find variant/i.test(body)) {
            this._delayer = await waitForDelay(monitorDelay);
            return { message: 'Monitoring for product', nextState: States.AddToCart };
          }
    
          if (this.chosenShippingMethod.id && !this.needsPatched) {
            return { message: 'Posting payment', nextState: States.PostPayment };
          }
          return { message: 'Creating checkout', nextState: States.CreateCheckout };
        } catch (err) {
          this._logger.error(
            'FRONTEND CHECKOUT: %s Request Error..\n Step: Add to Cart.\n\n %j %j',
            err.status,
            err.message,
            err.stack,
          );
          const nextState = stateForError(err, {
            message: 'Adding to cart',
            nextState: States.AddToCart,
          });
    
          const message = err.status ? `Adding to cart - (${err.status})` : 'Adding to cart';
    
          return nextState || { message, nextState: States.AddToCart };
        }
    }

    async submitCustomerInfo() {
    }

    async submitShipping() {

    }

    async submitPayment() {

    }

    async completePayment() {
        
    }
}