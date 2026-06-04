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
    processPayout,
    calculatePayouts
  }
} = require('../controllers');
const {
  PayoutValidator: {
    addBankAccountValidator,
    updateBankAccountValidator,
    updateSettingValidator,
    calculatePayoutsValidator,
    processPayoutValidator,
    payoutsListValidator
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
    method: 'POST',
    path: '/admin/payout/calculate',
    options: {
      description: 'Calculate pending payouts for doctors',
      tags,
      pre: [SessionValidator],
      validate: {
        payload: calculatePayoutsValidator,
        headers: HeaderValidator
      }
    },
    handler: calculatePayouts
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
    path: '/admin/payout/process',
    options: {
      description: 'Process pending payouts',
      tags,
      pre: [SessionValidator],
      validate: {
        payload: processPayoutValidator,
        headers: HeaderValidator
      }
    },
    handler: processPayout
  }
];
