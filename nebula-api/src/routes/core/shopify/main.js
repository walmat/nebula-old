const { pay } = require('./classes/pay');
const { findItem, selectStyle } = require('./classes/findItem');

/*

task: {
	id: string,
	product: {
		raw: string,
		pos_keywords: [],
		neg_keywords: [],
		url: [],
	},
	site: string,
	profile: {
		id: string,
		profileName: string,
		billingMatchesShipping: bool,
		shipping: {
			firstName: string,
			lastName: string,
			address: string,
			apt: string,
			city: string,
			country: string,
			state: string,
			zipCode: string,
			phone: string,
		},
		billing: {
			firstName: string,
			lastName: string,
			address: string,
			apt: string,
			city: string,
			country: string,
			state: string,
			zipCode: string,
			phone: string,
		},
		payment: {
			email: string,
			cardNumber: string,
			exp: string,
			cvv, string,
		},
	},
	sizes: [],
	pairs: 1 - 5,
	status: string,
}

*/


module.exports = async function(task) {

    findItem(task, proxies[index], function(err, delay, res) {

        if (err) {
            console.log(res);
            // make this more extensive once we figure out the layout and everything
            setTimeout(() => {
                return run(config);
            }, delay);
        } else {
            selectStyle(config, res, (match, styleID) => {
                pay(config, match, styleID, (err) => {

                    //TODO -- handle moving onto the next user desired size and all that

                    if (err === 'sold out') {
                        return run(config);
                    }
                });
            });
        }
    });
};