const Joi = require('joi');
const convertJoiErrorsToJSONPointer = require('../../utils/convertJoiErrorsToJSONPointer');

//the schema will be used to validate our input on the POST request
const taskSchema = Joi.object().keys({
    registrationKey: Joi.string()
        .required()
        .label('Registration Key'),
    sku: Joi.string()
        .required()
        .label('task sku')
});

const options = {
    abortEarly: false,
    convert: false,
    stripUnknown: true,
    allowUnknown: true, // this is to prevent breaking changes to the backend api
    language: {
        any: {
            required: '!!Required Field',
            empty: '!!Required Field',
        }
    }
};

module.exports = function validateTask(taskData) {
    let result = Joi.validate(taskData, taskSchema, options);
    if (result.error) {
        return {
            fail: convertJoiErrorsToJSONPointer(result.error)
        };
    }
    return {
        success: result.value
    };
};