const Joi = require('joi');
const convertJoiErrorsToJSONPointer = require('../../utils/convertJoiErrorsToJSONPointer');

//the schema will be used to validate our input on the POST request
const profilesSchema = Joi.object().keys({
	registrationKey: Joi.string()
		.required()
		.label('Registration Key'),
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
		city: Joi.string()
				.required()
				.label('Shipping City'),
		county: Joi.string()
					.required()
					.label('Shipping Country'),
		state: Joi.string()
					.label('Shipping State'), //need to make this required if country is united state somehow
		zipCode: Joi.string()
					.required()
					.label('Shipping Zip Code'),
		phone: Joi.string()
					.required()
					.label('Shipping Phone number')
	}),
	Billing: Joi.object().keys({
		firstName: Joi.string()
					.required()
					.label('Billing first name'),
		lastName: Joi.string()
					.required()
					.label('Billing last name'),
		address: Joi.string()
					.required()
					.label('Shipping Address'),
		city: Joi.string()
				.required()
				.label('Shipping City'),
		country: Joi.string()
					.required()
					.label('Shipping Country'),
		state: Joi.string()
					.label('Shipping State'),
		zipCode: Joi.string()
					.required()
					.label('Shipping Zip Code'),
		phone: Joi.string()
					.required()
					.label('Shipping Phone number')
	}),
	Payment: Joi.object().keys({
		email: Joi.string()
				.email()
				.required()
				.label('Email'),
		cardNumber: Joi.string()
				.creditCard()
				.required()
				.label('Card Number'),
		exp: Joi.date()
				.required()
				.label('Expiration Date'),
		cvv: Joi.string()
				.regex(/[0-9]+/)
				.length(3)
				.required()
				.label('CVV')
	})
});

const options = {
	abortEarly: false,
	convert: false,
	stripUnknown: true,
	allowUnknown: true // this is to prevent breaking changes to the Profiles backend api
}

function toJSONPointerPath(pathParts) {
    return `/${pathParts.join('/')}`;
}

function convertToJSONPointer(errors) {
    return errors.details.reduce((grouped, detail) => {
        let path = toJSONPointerPath(detail.path);
        (grouped[path] = grouped[path] || [])
            .push(detail.message);
        return grouped;
    }, {});
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