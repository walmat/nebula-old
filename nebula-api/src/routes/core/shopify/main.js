const { pay } = require('./classes/pay');
const { findProduct, getVariantsBySize } = require('./classes/findItem');
const now = require("performance-now");

let task = {
	id: '01',
	product: {
		raw: '+yeezy',
		pos_keywords: ['YEEZY', '110MM'],
		neg_keywords: ['LIGHT'],
		variant: null,
		url: null,
	},
	site: 'https://kith.com',
	profile: {
		id: '0',
		profileName: 'test profile',
		billingMatchesShipping: true,
		shipping: {
			firstName: 'Matthew',
			lastName: 'Wall',
			address: '13411 Oak Park Blvd',
			apt: null,
			city: 'Oak Park',
			country: 'United States',
			state: 'Michigan',
			zipCode: '48237',
			phone: '5157206516',
		},
		billing: {
			firstName: 'Matthew',
			lastName: 'Wall',
			address: '13411 Oak Park Blvd',
			apt: null,
			city: 'Oak Park',
			country: 'United States',
			state: 'Michigan',
			zipCode: '48237',
			phone: '5157206516',
		},
		payment: {
			email: 'matthew.wallt@gmail.com',
			cardNumber: '4079413306285183',
			exp: '05/21',
			cvv: '188',
		},
	},
	sizes: ['8.5', '9', '9.5'],
	status: 'idle',
	errorDelay: 2000,
	monitorDelay: 2000,
}

let proxies = [];
let index = 0;

const runTask = async () => {
	await findProduct(task, proxies[index])
	.then((res) => {
		pay(task, res.products, (err) => {
			console.log(err);
		})
	});
}

runTask();

module.exports.runTask = runTask;