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

const calculatePayoutsValidator = Joi.object({
  doctor_id: Joi.number().optional()
}).unknown();

const processPayoutValidator = Joi.object({
  doctor_id: Joi.number().optional(),
  payout_ids: Joi.array().items(Joi.number()).optional()
}).unknown();

const payoutsListValidator = Joi.object({
  status: Joi.string().optional(),
  doctor_id: Joi.number().optional()
}).unknown();

module.exports = {
  addBankAccountValidator,
  updateBankAccountValidator,
  updateSettingValidator,
  calculatePayoutsValidator,
  processPayoutValidator,
  payoutsListValidator
};
