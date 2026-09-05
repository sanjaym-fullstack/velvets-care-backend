const Joi = require('joi');

const addBankAccountValidator = Joi.object({
    account_holder_name: Joi.string().required().messages({
        'string.base': 'Account holder name must be a string',
        'string.empty': 'Account holder name is required',
        'any.required': 'Account holder name is required',
    }),
    account_number: Joi.string().required().messages({
        'string.base': 'Account number must be a string',
        'string.empty': 'Account number is required',
        'any.required': 'Account number is required',
    }),
    ifsc_code: Joi.string().required().messages({
        'string.base': 'IFSC code must be a string',
        'string.empty': 'IFSC code is required',
        'any.required': 'IFSC code is required',
    }),
    bank_name: Joi.string().optional().allow('').messages({
        'string.base': 'Bank name must be a string',
    }),
    branch_name: Joi.string().optional().allow('').messages({
        'string.base': 'Branch name must be a string',
    })
}).unknown();

const updateBankAccountValidator = Joi.object({
    account_holder_name: Joi.string().optional().messages({
        'string.base': 'Account holder name must be a string',
    }),
    account_number: Joi.string().optional().messages({
        'string.base': 'Account number must be a string',
    }),
    ifsc_code: Joi.string().optional().messages({
        'string.base': 'IFSC code must be a string',
    }),
    bank_name: Joi.string().optional().allow('').messages({
        'string.base': 'Bank name must be a string',
    }),
    branch_name: Joi.string().optional().allow('').messages({
        'string.base': 'Branch name must be a string',
    })
}).unknown();

const updateSettingValidator = Joi.object({
    id: Joi.number().required().messages({
        'number.base': 'Setting ID must be a number',
        'any.required': 'Setting ID is required',
    }),
    value: Joi.number().required().messages({
        'number.base': 'Value must be a number',
        'any.required': 'Value is required',
    })
}).unknown();

const payoutPlanValidator = Joi.object({
    doctor_id: Joi.number().optional().messages({
        'number.base': 'Doctor ID must be a number',
    }),
    from_date: Joi.string().optional().messages({
        'string.base': 'From date must be a string',
    }),
    to_date: Joi.string().optional().messages({
        'string.base': 'To date must be a string',
    })
}).unknown();

const markAsPaidValidator = Joi.object({
    doctor_id: Joi.number().required().messages({
        'number.base': 'Doctor ID must be a number',
        'any.required': 'Doctor ID is required',
    }),
    from_date: Joi.string().required().messages({
        'string.base': 'From date must be a string',
        'string.empty': 'From date is required',
        'any.required': 'From date is required',
    }),
    to_date: Joi.string().required().messages({
        'string.base': 'To date must be a string',
        'string.empty': 'To date is required',
        'any.required': 'To date is required',
    }),
    comment: Joi.string().optional().allow('').messages({
        'string.base': 'Comment must be a string',
    }),
    transaction_id: Joi.string().required().messages({
        'string.base': 'Transaction ID must be a string',
        'string.empty': 'Transaction ID is required',
        'any.required': 'Transaction ID is required',
    })
}).unknown();

const payoutsListValidator = Joi.object({
    status: Joi.string().optional().messages({
        'string.base': 'Status must be a string',
    }),
    doctor_id: Joi.number().optional().messages({
        'number.base': 'Doctor ID must be a number',
    }),
    from_date: Joi.string().optional().messages({
        'string.base': 'From date must be a string',
    }),
    to_date: Joi.string().optional().messages({
        'string.base': 'To date must be a string',
    })
}).unknown();

const payoutHistoryValidator = Joi.object({
    doctor_id: Joi.number().optional().messages({
        'number.base': 'Doctor ID must be a number',
    }),
    from_date: Joi.string().optional().messages({
        'string.base': 'From date must be a string',
    }),
    to_date: Joi.string().optional().messages({
        'string.base': 'To date must be a string',
    })
}).unknown();

const docktorBackAccountFetchingParamsValidator = Joi.object({
    doctor_id: Joi.number().optional().messages({
        'number.base': 'Doctor ID must be a number',
    }),
});

module.exports = {
    addBankAccountValidator,
    updateBankAccountValidator,
    updateSettingValidator,
    payoutPlanValidator,
    markAsPaidValidator,
    payoutsListValidator,
    payoutHistoryValidator,
    docktorBackAccountFetchingParamsValidator
};