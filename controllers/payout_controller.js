const { PayoutSettings, DoctorBankAccounts, Payouts, Doctors, Appointments } = require('../models');
const { RazorpayFunctions } = require('../helpers');
const { Op } = require('sequelize');
const Sequelize = require('sequelize');

const getSettings = async (req, res) => {
  try {
    const settings = await PayoutSettings.findAll({ raw: true });
    return res.response({ success: true, message: 'Payout settings fetched', data: settings }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message }).code(200);
  }
};

const updateSetting = async (req, res) => {
  try {
    const { id, value } = req.payload;
    const setting = await PayoutSettings.findByPk(id);
    if (!setting) return res.response({ success: false, message: 'Setting not found' }).code(404);

    setting.value = value;
    await setting.save();

    return res.response({ success: true, message: 'Setting updated', data: setting }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message }).code(200);
  }
};

const addBankAccount = async (req, res) => {
  try {
    const user = req.headers.user;
    const doctor_id = user.id;
    const { account_holder_name, account_number, ifsc_code, bank_name, branch_name } = req.payload;

    const existing = await DoctorBankAccounts.findOne({ where: { doctor_id } });
    if (existing) return res.response({ success: false, message: 'Bank account already exists. Use update endpoint.' }).code(400);

    const doctor = await Doctors.findByPk(doctor_id);
    if (!doctor) return res.response({ success: false, message: 'Doctor not found' }).code(404);

    let razorpay_contact_id = null;
    let razorpay_fund_account_id = null;

    try {
      const contact = await RazorpayFunctions.createRazorpayContact(
        doctor.full_name,
        doctor.phone?.toString(),
        doctor.email,
        `DR${doctor_id}`
      );
      razorpay_contact_id = contact.id;

      const fundAccount = await RazorpayFunctions.createRazorpayFundAccount(
        contact.id,
        account_holder_name,
        account_number,
        ifsc_code
      );
      razorpay_fund_account_id = fundAccount.id;
    } catch (rpErr) {
      console.error('Razorpay API error (non-blocking):', rpErr.message);
    }

    const bankAccount = await DoctorBankAccounts.create({
      doctor_id,
      account_holder_name,
      account_number,
      ifsc_code,
      bank_name,
      branch_name,
      razorpay_contact_id,
      razorpay_fund_account_id
    });

    return res.response({ success: true, message: 'Bank account added', data: bankAccount }).code(201);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message }).code(200);
  }
};

const updateBankAccount = async (req, res) => {
  try {
    const user = req.headers.user;
    const doctor_id = user.id;
    const { account_holder_name, account_number, ifsc_code, bank_name, branch_name } = req.payload;

    const bankAccount = await DoctorBankAccounts.findOne({ where: { doctor_id } });
    if (!bankAccount) return res.response({ success: false, message: 'No bank account found. Add one first.' }).code(404);

    bankAccount.account_holder_name = account_holder_name || bankAccount.account_holder_name;
    bankAccount.account_number = account_number || bankAccount.account_number;
    bankAccount.ifsc_code = ifsc_code || bankAccount.ifsc_code;
    bankAccount.bank_name = bank_name || bankAccount.bank_name;
    bankAccount.branch_name = branch_name || bankAccount.branch_name;
    bankAccount.razorpay_contact_id = null;
    bankAccount.razorpay_fund_account_id = null;
    await bankAccount.save();

    try {
      const doctor = await Doctors.findByPk(doctor_id);
      const contact = await RazorpayFunctions.createRazorpayContact(
        doctor.full_name,
        doctor.phone?.toString(),
        doctor.email,
        `DR${doctor_id}`
      );
      bankAccount.razorpay_contact_id = contact.id;

      const fundAccount = await RazorpayFunctions.createRazorpayFundAccount(
        contact.id,
        bankAccount.account_holder_name,
        bankAccount.account_number,
        bankAccount.ifsc_code
      );
      bankAccount.razorpay_fund_account_id = fundAccount.id;
      await bankAccount.save();
    } catch (rpErr) {
      console.error('Razorpay API error (non-blocking):', rpErr.message);
    }

    return res.response({ success: true, message: 'Bank account updated', data: bankAccount }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message }).code(200);
  }
};

const getBankAccount = async (req, res) => {
  try {
    const user = req.headers.user;
    const doctor_id = user.id;
    const bankAccount = await DoctorBankAccounts.findOne({ where: { doctor_id } });
    if (!bankAccount) return res.response({ success: false, message: 'No bank account found' }).code(404);
    return res.response({ success: true, message: 'Bank account fetched', data: bankAccount }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message }).code(200);
  }
};

const getAdminPayouts = async (req, res) => {
  try {
    const { status, doctor_id } = req.query;
    const where = {};
    if (status) where.status = status;
    if (doctor_id) where.doctor_id = doctor_id;

    const payouts = await Payouts.findAll({
      where,
      include: [{
        model: Doctors,
        attributes: ['id', 'full_name', 'phone', 'email', 'specialization', 'consultation_fee']
      }],
      order: [['createdAt', 'DESC']]
    });

    return res.response({ success: true, message: 'Payouts fetched', data: payouts }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message }).code(200);
  }
};

const getDoctorPayouts = async (req, res) => {
  try {
    const user = req.headers.user;
    const doctor_id = user.id;

    const payouts = await Payouts.findAll({
      where: { doctor_id },
      order: [['createdAt', 'DESC']]
    });

    const totalPaid = payouts
      .filter(p => p.status === 'processed')
      .reduce((sum, p) => sum + p.net_payout, 0);

    return res.response({
      success: true,
      message: 'Your payouts fetched',
      data: { payouts, totalPaid }
    }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message }).code(200);
  }
};

const processPayout = async (req, res) => {
  try {
    const { doctor_id, payout_ids } = req.payload;

    const settings = await PayoutSettings.findAll({ raw: true });
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });

    const platformFeePerc = settingsMap.platform_fee_percentage || 10;
    const gstPerc = settingsMap.gst_percentage || 18;
    const accountNumber = process.env.RAZORPAY_X_ACCOUNT_NUMBER;

    let payoutsToProcess;

    if (payout_ids && payout_ids.length > 0) {
      payoutsToProcess = await Payouts.findAll({
        where: { id: { [Op.in]: payout_ids }, doctor_id, status: 'pending' }
      });
    } else if (doctor_id) {
      payoutsToProcess = await Payouts.findAll({
        where: { doctor_id, status: 'pending' }
      });
    } else {
      payoutsToProcess = await Payouts.findAll({
        where: { status: 'pending' }
      });
    }

    if (!payoutsToProcess.length) {
      return res.response({ success: false, message: 'No pending payouts found' }).code(400);
    }

    const bankAccount = await DoctorBankAccounts.findOne({ where: { doctor_id: payoutsToProcess[0].doctor_id } });
    if (!bankAccount || !bankAccount.razorpay_fund_account_id) {
      return res.response({ success: false, message: 'Doctor has no bank account or fund account' }).code(400);
    }

    const processed = [];

    for (const payout of payoutsToProcess) {
      try {
        const payoutResult = await RazorpayFunctions.createRazorpayPayout(
          accountNumber,
          bankAccount.razorpay_fund_account_id,
          payout.net_payout,
          settingsMap.payout_mode === 1 ? 'NEFT' : 'IMPS',
          'payout',
          `Payout for Dr. ${bankAccount.account_holder_name}`
        );

        payout.status = 'processing';
        payout.razorpay_payout_id = payoutResult.id;
        payout.utr = payoutResult.utr || null;
        payout.processed_at = new Date();
        await payout.save();

        processed.push(payout);
      } catch (pErr) {
        console.error(`Payout ${payout.id} failed:`, pErr.message);
        payout.status = 'failed';
        await payout.save();
        processed.push({ id: payout.id, status: 'failed', error: pErr.message });
      }
    }

    return res.response({
      success: true,
      message: 'Payouts processed',
      data: { processed }
    }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message }).code(200);
  }
};

const calculatePayouts = async (req, res) => {
  try {
    const { doctor_id } = req.payload;

    const settings = await PayoutSettings.findAll({ raw: true });
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });

    const platformFeePerc = settingsMap.platform_fee_percentage || 10;
    const gstPerc = settingsMap.gst_percentage || 18;
    const minPayout = settingsMap.minimum_payout_amount || 100;

    const where = { status: 'completed', payment_status: 'paid' };
    if (doctor_id) where.doctor_id = doctor_id;

    const appointments = await Appointments.findAll({
      where,
      attributes: [
        'doctor_id',
        [Sequelize.fn('SUM', Sequelize.col('consultation_fee')), 'total_earnings']
      ],
      include: [{
        model: Doctors,
        attributes: ['id', 'full_name', 'phone', 'email'],
        where: doctor_id ? {} : { status: true, verified: true }
      }],
      group: ['doctor_id'],
      raw: true
    });

    if (!appointments.length) {
      return res.response({ success: false, message: 'No earnings found for payout' }).code(400);
    }

    const payoutEntries = [];

    for (const row of appointments) {
      const totalEarnings = parseFloat(row.total_earnings) || 0;
      if (totalEarnings < minPayout) continue;

      const platformFeeAmount = parseFloat((totalEarnings * platformFeePerc / 100).toFixed(2));
      const gstAmount = parseFloat((platformFeeAmount * gstPerc / 100).toFixed(2));
      const totalDeductions = parseFloat((platformFeeAmount + gstAmount).toFixed(2));
      const netPayout = parseFloat((totalEarnings - totalDeductions).toFixed(2));

      const existing = await Payouts.findOne({
        where: { doctor_id: row.doctor_id, status: 'pending' }
      });

      if (!existing) {
        await Payouts.create({
          doctor_id: row.doctor_id,
          total_earnings: totalEarnings,
          platform_fee_percentage: platformFeePerc,
          platform_fee_amount: platformFeeAmount,
          gst_percentage: gstPerc,
          gst_amount: gstAmount,
          total_deductions: totalDeductions,
          net_payout: netPayout,
          status: 'pending'
        });
      }

      payoutEntries.push({
        doctor_id: row.doctor_id,
        total_earnings: totalEarnings,
        platform_fee_percentage: platformFeePerc,
        platform_fee_amount: platformFeeAmount,
        gst_percentage: gstPerc,
        gst_amount: gstAmount,
        total_deductions: totalDeductions,
        net_payout: netPayout
      });
    }

    return res.response({
      success: true,
      message: 'Payouts calculated',
      data: payoutEntries
    }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message }).code(200);
  }
};

module.exports = {
  getSettings,
  updateSetting,
  addBankAccount,
  updateBankAccount,
  getBankAccount,
  getAdminPayouts,
  getDoctorPayouts,
  processPayout,
  calculatePayouts
};
