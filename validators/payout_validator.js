const Joi = require('joi');

const addBankAccountValidator = Joi.object({
  account_holder_name: Joi.string().required().messages({
    'any.required': 'Account holder name is required'
  }),
  account_number: Joi.string().required().messages({
    'any.required': 'Account number is required'
  }),
  ifsc_code: Joi.string().required().messages({
    'any.required': 'IFSC code is required'
  }),
  bank_name: Joi.string().optional().allow(''),
  branch_name: Joi.string().optional().allow('')
}).unknown();

const updateBankAccountValidator = Joi.object({
  account_holder_name: Joi.string().optional(),
  account_number: Joi.string().optional(),
  ifsc_code: Joi.string().optional(),
  bank_name: Joi.string().optional().allow(''),
  branch_name: Joi.string().optional().allow('')
}).unknown();

const updateSettingValidator = Joi.object({
  id: Joi.number().required().messages({ 'any.required': 'Setting ID is required' }),
  value: Joi.number().required().messages({ 'any.required': 'Value is required' })
}).unknown();

const payoutPlanValidator = Joi.object({
  doctor_id: Joi.number().optional(),
  from_date: Joi.string().optional(),
  to_date: Joi.string().optional()
}).unknown();

const markAsPaidValidator = Joi.object({
  doctor_id: Joi.number().required().messages({
    'any.required': 'Doctor ID is required'
  }),
  from_date: Joi.string().required().messages({
    'any.required': 'From date is required'
  }),
  to_date: Joi.string().required().messages({
    'any.required': 'To date is required'
  }),
  comment: Joi.string().optional().allow(''),
  transaction_id: Joi.string().required().messages({
    'any.required': 'Transaction ID is required'
  })
}).unknown();

const payoutsListValidator = Joi.object({
  status: Joi.string().optional(),
  doctor_id: Joi.number().optional(),
  from_date: Joi.string().optional(),
  to_date: Joi.string().optional()
}).unknown();

const payoutHistoryValidator = Joi.object({
  doctor_id: Joi.number().optional(),
  from_date: Joi.string().optional(),
  to_date: Joi.string().optional()
}).unknown();
const docktorBackAccountFetchingParamsValidator = Joi.object({
  doctor_id: Joi.number().optional(),
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
