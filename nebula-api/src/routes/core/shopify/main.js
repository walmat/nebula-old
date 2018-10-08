const { pay } = require('./classes/pay');
const { findProduct, getVariantsBySize } = require('./classes/findItem');

let task = {
	id: '01',
	product: {
		raw: '+yeezy',
		pos_keywords: ['+yeezy'],
		neg_keywords: ['-500'],
		variant: null,
		url: null,
	},
	site: 'https://blendsus.com',
	profile: {
		id: '0',
		profileName: 'test profile',
		billingMatchesShipping: true,
		shipping: {
			firstName: 'matt',
			lastName: 'wall',
			address: '1333 park drive',
			apt: null,
			city: 'oak park',
			country: 'United States',
			state: 'MI',
			zipCode: '48237',
			phone: '5157206516',
		},
		billing: {
			firstName: '',
			lastName: '',
			address: '',
			apt: '',
			city: '',
			country: '',
			state: '',
			zipCode: '',
			phone: '',
		},
		payment: {
			email: 'matthew.wallt@gmail.com',
			cardNumber: '4111111111111',
			exp: '03/15',
			cvv: '168',
		},
	},
	sizes: ['8', '8.5', '9'],
	status: 'idle',
	errorDelay: 2000,
	monitorDelay: 2000,
}

let proxies = [];
let index = 0;

const runTask = async () => {
	await findProduct(task, proxies[index]).then(async (products) => {
		
	});
}

runTask();

// findProduct(task, proxies[index], function(error, delay, products) {

// 	if (err) {
// 		console.log(res);
// 	} else {
// 		getVariantsBySize(task, res, (matches, productUrl) => {
// 			pay(task, matches, productUrl, (err) => {

// 				//TODO -- handle moving onto the next user desired size and all that

// 				if (err === 'sold out') {
// 					return run(config);
// 				}
// 			});
// 		});
// 	}
// });

module.exports.runTask = runTask;