const {
  SessionValidator
} = require('../middlewares');
const {
  PayoutController: {
    getSettings,
    updateSetting,
    addBankAccount,
    updateBankAccount,
    getBankAccount,
    getAdminPayouts,
    getDoctorPayouts,
    getPayoutPlan,
    markAsPaid,
    getPayoutHistory
  }
} = require('../controllers');
const {
  PayoutValidator: {
    addBankAccountValidator,
    updateBankAccountValidator,
    updateSettingValidator,
    payoutPlanValidator,
    markAsPaidValidator,
    payoutsListValidator,
    payoutHistoryValidator
  }
} = require('../validators');
const {
  HeaderValidator
} = require('../validators');
const tags = ['api', 'Payout'];

module.exports = [
  {
    method: 'GET',
    path: '/admin/payout/settings',
    options: {
      description: 'Get payout settings',
      tags,
      pre: [SessionValidator],
      validate: {
        headers: HeaderValidator
      }
    },
    handler: getSettings
  },
  {
    method: 'PUT',
    path: '/admin/payout/settings',
    options: {
      description: 'Update payout setting',
      tags,
      pre: [SessionValidator],
      validate: {
        payload: updateSettingValidator,
        headers: HeaderValidator
      }
    },
    handler: updateSetting
  },
  {
    method: 'POST',
    path: '/doctor/bank-account',
    options: {
      description: 'Add doctor bank account',
      tags,
      pre: [SessionValidator],
      validate: {
        payload: addBankAccountValidator,
        headers: HeaderValidator
      }
    },
    handler: addBankAccount
  },
  {
    method: 'PUT',
    path: '/doctor/bank-account',
    options: {
      description: 'Update doctor bank account',
      tags,
      pre: [SessionValidator],
      validate: {
        payload: updateBankAccountValidator,
        headers: HeaderValidator
      }
    },
    handler: updateBankAccount
  },
  {
    method: 'GET',
    path: '/doctor/bank-account',
    options: {
      description: 'Get doctor bank account',
      tags,
      pre: [SessionValidator],
      validate: {
        headers: HeaderValidator
      }
    },
    handler: getBankAccount
  },
  {
    method: 'GET',
    path: '/admin/payout/plan',
    options: {
      description: 'Get payout plan from last paid to current date',
      tags,
      pre: [SessionValidator],
      validate: {
        query: payoutPlanValidator,
        headers: HeaderValidator
      }
    },
    handler: getPayoutPlan
  },
  {
    method: 'GET',
    path: '/admin/payouts',
    options: {
      description: 'Get all payouts (admin)',
      tags,
      pre: [SessionValidator],
      validate: {
        query: payoutsListValidator,
        headers: HeaderValidator
      }
    },
    handler: getAdminPayouts
  },
  {
    method: 'GET',
    path: '/doctor/payouts',
    options: {
      description: 'Get doctor payouts',
      tags,
      pre: [SessionValidator],
      validate: {
        headers: HeaderValidator
      }
    },
    handler: getDoctorPayouts
  },
  {
    method: 'POST',
    path: '/admin/payout/mark-paid',
    options: {
      description: 'Mark payout as paid for a date range',
      tags,
      pre: [SessionValidator],
      validate: {
        payload: markAsPaidValidator,
        headers: HeaderValidator
      }
    },
    handler: markAsPaid
  },
  {
    method: 'GET',
    path: '/admin/payout/history',
    options: {
      description: 'Get completed payout history',
      tags,
      pre: [SessionValidator],
      validate: {
        query: payoutHistoryValidator,
        headers: HeaderValidator
      }
    },
    handler: getPayoutHistory
  }
];
