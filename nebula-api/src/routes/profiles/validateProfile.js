const Joi = require('joi');
const convertJoiErrorsToJSONPointer = require('../../utils/convertJoiErrorsToJSONPointer');

//the schema will be used to validate our input on the POST request
const profilesSchema = Joi.object().keys({
	profileName: Joi.string()
		.required()
		.label('Profile Name'),
	shipping: Joi.object().keys({
		firstName: Joi.string()
					.required()
					.label('Shipping first name'),
		lastName: Joi.string()
					.required()
					.label('Shipping last name'),
		address: Joi.string()
					.required()
					.label('Shipping Address'),
		apt: Joi.string()
				.label('Apt/Suite Number')
				.allow(''),
		city: Joi.string()
				.required()
				.label('Shipping City'),
		country: Joi.string()
					.required()
            		.regex(/^((?!country).)*$/)
					.label('Shipping Country'),
		state: Joi.string()
					.required()
            		.regex(/^((?!state).)*$/)
					.label('Shipping State'), //need to make this required if country is united state somehow
		zipCode: Joi.string()
					.required()
					.label('Shipping Zip Code'),
		phone: Joi.string()
					.required()
					.label('Shipping Phone number')
	}),
	billing: Joi.object().keys({
		firstName: Joi.string()
					.required()
					.label('Billing first name'),
		lastName: Joi.string()
					.required()
					.label('Billing last name'),
		address: Joi.string()
					.required()
					.label('Shipping Address'),
		apt: Joi.string()
				.allow('')
				.label('Apt/Suite Number'),
		city: Joi.string()
				.required()
				.label('Shipping City'),
		country: Joi.string()
					.required()
					.regex(/^((?!COUNTRY).)*$/)
					.label('Shipping Country'),
		state: Joi.string()
					.required()
            		.regex(/^((?!STATE).)*$/)
					.label('Shipping State'),
		zipCode: Joi.string()
					.required()
					.label('Shipping Zip Code'),
		phone: Joi.string()
					.required()
					.label('Shipping Phone number')
	}),
	payment: Joi.object().keys({
		email: Joi.string()
				.email()
				.required()
				.label('Email'),
		cardNumber: Joi.string()
				.required()
				.creditCard()
				.label('Card Number'),
		exp: Joi.string()
				.required()
				.label('Expiration Date'),
		cvv: Joi.string()
				.required()
				.regex(/[0-9]{3}/, 'cvv')
				.label('CVV')
	})
});

const options = {
	abortEarly: false,
	convert: false,
	stripUnknown: true,
	allowUnknown: true, // this is to prevent breaking changes to the Profiles backend api
	language: {
        any: {
            required: '!!Required Field',
			empty: '!!Required Field',
		},
		date: {
			base: '!!Must be a valid date'
		},
		string: {
			email: '!!Must be a valid email',
			creditCard: '!!Must be a valid credit card number',
			regex: {
				base: {
					cvv:'!!Must contain only numbers and be three characters long'
				}
			}
		}
    }
}

module.exports = function validateProfile(profileData) {
    let result = Joi.validate(profileData, profilesSchema, options);
    if (result.error) {
        return {
            fail: convertJoiErrorsToJSONPointer(result.error)
        };
    }
    return {
        success: result.value
    };
};