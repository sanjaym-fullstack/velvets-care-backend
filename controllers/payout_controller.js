const { PayoutSettings, DoctorBankAccounts, Payouts, Doctors, Appointments } = require('../models');
const { Op, fn, col } = require('sequelize');
const Sequelize = require('sequelize');
const { decryptText, encryptText } = require('../helpers/encryption');

const getSettings = async (req, res) => {
  try {
    const settings = await PayoutSettings.findAll({ raw: true });
    return res.response({ success: true, message: 'Payout settings fetched', data: settings }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message }).code(200);
  }
};

const normalizeDate = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    const doctor_id = user.doctor_id;
    const { account_holder_name, account_number, ifsc_code, bank_name, branch_name } = req.payload;

    const existing = await DoctorBankAccounts.findOne({ where: { doctor_id } });
    if (existing) return res.response({ success: false, message: 'Bank account already exists. Use update endpoint.' }).code(400);

    const bankAccount = await DoctorBankAccounts.create({
      doctor_id,
      account_holder_name: await encryptText(account_holder_name),
      account_number: await encryptText(account_number),
      ifsc_code: await encryptText(ifsc_code),
      bank_name: await encryptText(bank_name),
      branch_name: await encryptText(branch_name)
    });

    return res.response({ success: true, message: 'Bank account added', data: bankAccount }).code(201);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message }).code(200);
  }
};
const addBankAccountAdmin = async (req, res) => {
  try {
    const user = req.headers.user;
    if (!user || user.role != 'ADMIN') return res.response({ success: false, message: 'Unauthorized' }).code(403);
    const { doctor_id } = req.params;

    const doctor = await Doctors.findByPk(doctor_id);
    if (!doctor) return res.response({ success: false, message: 'Doctor not found' }).code(200);

    const { account_holder_name, account_number, ifsc_code, bank_name, branch_name } = req.payload;

    const existing = await DoctorBankAccounts.findOne({ where: { doctor_id } });
    if (existing) return res.response({ success: false, message: 'Bank account already exists. Use update endpoint.' }).code(200);

    const bankAccount = await DoctorBankAccounts.create({
      doctor_id,
      account_holder_name: await encryptText(account_holder_name),
      account_number: await encryptText(account_number),
      ifsc_code: await encryptText(ifsc_code),
      bank_name: await encryptText(bank_name),
      branch_name: await encryptText(branch_name)
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
    const doctor_id = user.doctor_id;
    const { account_holder_name, account_number, ifsc_code, bank_name, branch_name } = req.payload;

    const bankAccount = await DoctorBankAccounts.findOne({ where: { doctor_id } });
    if (!bankAccount) return res.response({ success: false, message: 'No bank account found. Add one first.' }).code(404);

    bankAccount.account_holder_name = await encryptText(account_holder_name || await decryptText(bankAccount.account_holder_name));
    bankAccount.account_number = await encryptText(account_number || await decryptText(bankAccount.account_number));
    bankAccount.ifsc_code = await encryptText(ifsc_code || await decryptText(bankAccount.ifsc_code));
    bankAccount.bank_name = await encryptText(bank_name || await decryptText(bankAccount.bank_name));
    bankAccount.branch_name = await encryptText(branch_name || await decryptText(bankAccount.branch_name));
    await bankAccount.save();

    return res.response({ success: true, message: 'Bank account updated', data: bankAccount }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message }).code(200);
  }
};

const updateBankAccountAdmin = async (req, res) => {
  try {
    const user = req.headers.user;
    if (!user || user.role != 'ADMIN') return res.response({ success: false, message: 'Unauthorized' }).code(403);

    const { doctor_id } = req.params;

    const doctor = await Doctors.findByPk(doctor_id);
    if (!doctor) return res.response({ success: false, message: 'Doctor not found' }).code(200);

    const { account_holder_name, account_number, ifsc_code, bank_name, branch_name } = req.payload;

    const bankAccount = await DoctorBankAccounts.findOne({ where: { doctor_id } });
    if (!bankAccount) return res.response({ success: false, message: 'No bank account found. Add one first.' }).code(200);

    bankAccount.account_holder_name = await encryptText(account_holder_name || await decryptText(bankAccount.account_holder_name));
    bankAccount.account_number = await encryptText(account_number || await decryptText(bankAccount.account_number));
    bankAccount.ifsc_code = await encryptText(ifsc_code || await decryptText(bankAccount.ifsc_code));
    bankAccount.bank_name = await encryptText(bank_name || await decryptText(bankAccount.bank_name));
    bankAccount.branch_name = await encryptText(branch_name || await decryptText(bankAccount.branch_name));
    await bankAccount.save();

    return res.response({ success: true, message: 'Bank account updated', data: bankAccount }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message }).code(200);
  }
};

const getBankAccount = async (req, res) => {
  try {
    const user = req.headers.user;
    const doctor_id = user.doctor_id;
    const bankAccount = await DoctorBankAccounts.findOne({ where: { doctor_id }, raw: true });
    if (!bankAccount) return res.response({ success: false, message: 'No bank account found' }).code(404);
    return res.response({
      success: true, message: 'Bank account fetched', data: {
        ...bankAccount,
        account_holder_name: await decryptText(bankAccount.account_holder_name),
        account_number: await decryptText(bankAccount.account_number),
        ifsc_code: await decryptText(bankAccount.ifsc_code),
        bank_name: await decryptText(bankAccount.bank_name),
        branch_name: await decryptText(bankAccount.branch_name),
      }
    }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message }).code(200);
  }
};
const getBankAccountAdmin = async (req, res) => {
  try {
    const user = req.headers.user;
    if (!user || user.role != 'ADMIN') return res.response({ success: false, message: 'Unauthorized' }).code(403);

    const { doctor_id } = req.params;

    const bankAccount = await DoctorBankAccounts.findOne({ where: { doctor_id }, raw: true });
    if (!bankAccount) return res.response({ success: false, message: 'No bank account found' }).code(200);
    return res.response({
      success: true, message: 'Bank account fetched', data: {
        ...bankAccount,
        account_holder_name: await decryptText(bankAccount.account_holder_name),
        account_number: await decryptText(bankAccount.account_number),
        ifsc_code: await decryptText(bankAccount.ifsc_code),
        bank_name: await decryptText(bankAccount.bank_name),
        branch_name: await decryptText(bankAccount.branch_name),
      }
    }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message }).code(200);
  }
};

const calculatePayouts = async (req, res) => {
  try {
    const { doctor_id, from_date, to_date } = req.query;
    if (!from_date && !to_date) {
      return res.response({ success: false, message: 'From date and to date are required' }).code(400);
    }
    if (from_date && to_date && new Date(from_date) > new Date(to_date)) {
      return res.response({ success: false, message: 'From date cannot be greater than to date' }).code(400);
    }
    const where = {};
    if (doctor_id) where.doctor_id = doctor_id;


    const startDate = normalizeDate(from_date);
    const endDate = normalizeDate(to_date);

    const appointments = await Appointments.findAll({
      attributes: [
        'doctor_id',
        [fn('SUM', col('appointments.consultation_fee')), 'total_consultation_fee'],
        [fn('COUNT', col('appointments.id')), 'total_appointments'],
      ],
      where: {
        status: 'completed',
        payment_status: 'paid',
        appointment_date: {
          [Op.between]: [startDate, endDate],
        },
        ...where,
      },
      include: [
        {
          model: Doctors,
          attributes: [
            'id',
            'full_name',
            'email',
            'phone',
            'specialization',
          ],
        },
      ],
      group: ['doctor.id', 'appointments.doctor_id'],
    });

    const platformFeePercentage = await PayoutSettings.findOne({ where: { key: 'platform_fee_percentage' }, raw: true }).then(s => parseFloat(s.value) || 10);
    const gstPercentage = await PayoutSettings.findOne({ where: { key: 'gst_percentage' }, raw: true }).then(s => parseFloat(s.value) || 18);

    const payouts = appointments.map((appointment) => {
      const totalEarnings = Number(appointment.get('total_consultation_fee'));

      const platformFeeAmount =
        (totalEarnings * platformFeePercentage) / 100;

      const gstAmount =
        (platformFeeAmount * gstPercentage) / 100;

      const totalDeductions =
        platformFeeAmount + gstAmount;

      const netPayout =
        totalEarnings - totalDeductions;

      return {
        doctor_id: appointment.doctor_id,
        total_earnings: totalEarnings,
        platform_fee_percentage: platformFeePercentage,
        platform_fee_amount: platformFeeAmount,
        gst_percentage: gstPercentage,
        gst_amount: gstAmount,
        total_deductions: totalDeductions,
        net_payout: netPayout,
        status: 'pending',
        payout_type: 'bank_transfer', // or 'manual'
        comment: null,
        transaction_id: null,
        processed_by: session_user.role, // Logged in admin id
        razorpay_payout_id: null,
        utr: null,
        from_date: startDate,
        to_date: endDate,
        processed_at: null,
      };
    });


    return res.response({ success: true, message: 'Payouts fetched', data: payouts }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message }).code(200);
  }
};

const getAdminPayouts = async (req, res) => {
  try {
    const { status, doctor_id, from_date, to_date } = req.query;
    const where = {};
    if (status) where.status = status;
    if (doctor_id) where.doctor_id = doctor_id;
    if (from_date && to_date) {
      where.processed_at = {
        [Op.between]: [new Date(from_date), new Date(new Date(to_date).setHours(23, 59, 59, 999))]
      };
    }

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

const getLastPayoutDate = async (doctor_id) => {
  const lastPayout = await Payouts.findOne({
    where: { doctor_id, status: 'processed' },
    order: [['to_date', 'DESC']]
  });
  return lastPayout ? lastPayout.to_date : null;
};

const getPayoutPlan = async (req, res) => {
  try {
    const { doctor_id, from_date, to_date } = req.query;

    const settings = await PayoutSettings.findAll({ raw: true });
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });

    const platformFeePerc = settingsMap.platform_fee_percentage || 10;
    const gstPerc = settingsMap.gst_percentage || 18;
    const minPayout = settingsMap.minimum_payout_amount || 100;

    const endDate = to_date ? new Date(to_date) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const doctorWhere = {};
    if (doctor_id) doctorWhere.id = doctor_id;

    const doctors = await Doctors.findAll({
      where: { ...doctorWhere, status: true, verified: true },
      attributes: ['id', 'full_name', 'phone', 'email', 'consultation_fee']
    });

    if (!doctors.length) {
      return res.response({ success: false, message: 'No doctors found' }).code(400);
    }

    const planEntries = [];

    for (const doctor of doctors) {
      let startDate;
      if (from_date) {
        startDate = new Date(from_date);
      } else {
        const lastDate = await getLastPayoutDate(doctor.id);
        if (lastDate) {
          startDate = new Date(lastDate);
          startDate.setDate(startDate.getDate() + 1);
        } else {
          startDate = new Date(0);
        }
      }
      startDate.setHours(0, 0, 0, 0);

      if (startDate >= endDate) continue;

      const appointments = await Appointments.findAll({
        where: {
          doctor_id: doctor.id,
          status: 'completed',
          payment_status: 'paid',
          appointment_date: {
            [Op.between]: [
              startDate.toISOString().split('T')[0],
              endDate.toISOString().split('T')[0]
            ]
          }
        },
        attributes: [
          [Sequelize.fn('SUM', Sequelize.col('consultation_fee')), 'total_earnings']
        ],
        raw: true
      });

      const totalEarnings = parseFloat(appointments[0]?.total_earnings) || 0;
      if (totalEarnings < minPayout) continue;

      const platformFeeAmount = parseFloat((totalEarnings * platformFeePerc / 100).toFixed(2));
      const gstAmount = parseFloat((platformFeeAmount * gstPerc / 100).toFixed(2));
      const totalDeductions = parseFloat((platformFeeAmount + gstAmount).toFixed(2));
      const netPayout = parseFloat((totalEarnings - totalDeductions).toFixed(2));

      planEntries.push({
        doctor_id: doctor.id,
        doctor_name: doctor.full_name,
        doctor_phone: doctor.phone,
        doctor_email: doctor.email,
        consultation_fee: doctor.consultation_fee,
        from_date: startDate.toISOString().split('T')[0],
        to_date: endDate.toISOString().split('T')[0],
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
      message: 'Payout plan fetched',
      data: planEntries
    }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message }).code(200);
  }
};

const markAsPaid = async (req, res) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) throw new Error('Session expired');

    const { doctor_id, from_date, to_date, comment, transaction_id } = req.payload;

    if (!doctor_id) throw new Error('Doctor ID is required');
    if (!from_date || !to_date) throw new Error('From date and to date are required');
    if (!transaction_id) throw new Error('Transaction ID is required');

    const settings = await PayoutSettings.findAll({ raw: true });
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });

    const platformFeePerc = settingsMap.platform_fee_percentage || 10;
    const gstPerc = settingsMap.gst_percentage || 18;

    const startDate = new Date(from_date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(to_date);
    endDate.setHours(23, 59, 59, 999);

    const appointments = await Appointments.findAll({
      where: {
        doctor_id,
        status: 'completed',
        payment_status: 'paid',
        appointment_date: {
          [Op.between]: [
            from_date,
            to_date
          ]
        }
      },
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('consultation_fee')), 'total_earnings']
      ],
      raw: true
    });

    const totalEarnings = parseFloat(appointments[0]?.total_earnings) || 0;
    if (totalEarnings <= 0) throw new Error('No earnings found for the selected period');

    const platformFeeAmount = parseFloat((totalEarnings * platformFeePerc / 100).toFixed(2));
    const gstAmount = parseFloat((platformFeeAmount * gstPerc / 100).toFixed(2));
    const totalDeductions = parseFloat((platformFeeAmount + gstAmount).toFixed(2));
    const netPayout = parseFloat((totalEarnings - totalDeductions).toFixed(2));

    const payout = await Payouts.create({
      doctor_id,
      total_earnings: totalEarnings,
      platform_fee_percentage: platformFeePerc,
      platform_fee_amount: platformFeeAmount,
      gst_percentage: gstPerc,
      gst_amount: gstAmount,
      total_deductions: totalDeductions,
      net_payout: netPayout,
      status: 'processed',
      payout_type: 'manual',
      comment: comment || null,
      transaction_id,
      from_date,
      to_date,
      processed_by: session_user.user_id || session_user.id,
      processed_at: new Date()
    });

    return res.response({
      success: true,
      message: 'Payout marked as paid successfully',
      data: payout
    }).code(201);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message }).code(200);
  }
};

const getPayoutHistory = async (req, res) => {
  try {
    const { doctor_id, from_date, to_date } = req.query;
    const where = { status: 'processed' };
    if (doctor_id) where.doctor_id = doctor_id;
    if (from_date && to_date) {
      where.processed_at = {
        [Op.between]: [new Date(from_date), new Date(new Date(to_date).setHours(23, 59, 59, 999))]
      };
    }

    const payouts = await Payouts.findAll({
      where,
      include: [{
        model: Doctors,
        attributes: ['id', 'full_name', 'phone', 'email', 'specialization', 'consultation_fee']
      }],
      order: [['processed_at', 'DESC']]
    });

    const summary = {
      total_payouts: payouts.length,
      total_earnings: payouts.reduce((s, p) => s + p.total_earnings, 0),
      total_deductions: payouts.reduce((s, p) => s + p.total_deductions, 0),
      total_net_paid: payouts.reduce((s, p) => s + p.net_payout, 0)
    };

    return res.response({
      success: true,
      message: 'Payout history fetched',
      data: { summary, payouts }
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
  addBankAccountAdmin,
  updateBankAccount,
  updateBankAccountAdmin,
  getBankAccount,
  getBankAccountAdmin,
  getAdminPayouts,
  calculatePayouts,
  getDoctorPayouts,
  getPayoutPlan,
  markAsPaid,
  getPayoutHistory
};
