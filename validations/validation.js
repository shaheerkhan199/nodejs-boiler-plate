const Joi = require("@hapi/joi");
const { join } = require("lodash");

module.exports = {
    validateMultipleIDs: function (obj) {
        const schema = Joi.object({
            id : Joi.array().required()
        });
        return schema.validate(obj,{allowUnknown: true});
    },
}