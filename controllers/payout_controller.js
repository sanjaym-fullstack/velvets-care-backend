const { PayoutSettings, DoctorBankAccounts, Payouts, Doctors, Appointments } = require('../models');
const { Op, fn, col } = require('sequelize');
const Sequelize = require('sequelize');
const { decryptText, encryptText } = require('../helpers/encryption');
const { NotificationHelper } = require('../helpers');

const getSettings = async (req, res) => {
  try {
    const settings = await PayoutSettings.findAll({ raw: true });
    return res.response({ success: true, message: 'Payout settings fetched', data: settings }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message || 'Something went wrong' }).code(200);
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
    return res.response({ success: false, message: err.message || 'Something went wrong' }).code(200);
  }
};

const addBankAccount = async (req, res) => {
  try {
    const user = req.headers.user;
    const doctor_id = user.doctor_id;
    const { account_holder_name, account_number, ifsc_code, bank_name, branch_name } = req.payload;

    const holderName = account_holder_name || 'Test User';
    const accNumber = account_number || '123456789012';
    const ifsc = ifsc_code || 'HDFC0001234';
    const bank = bank_name || 'HDFC Bank';
    const branch = branch_name || 'Main Branch';

    const existing = await DoctorBankAccounts.findOne({ where: { doctor_id } });
    if (existing) {
      existing.account_holder_name = await encryptText(holderName);
      existing.account_number = await encryptText(accNumber);
      existing.ifsc_code = await encryptText(ifsc);
      existing.bank_name = await encryptText(bank);
      existing.branch_name = await encryptText(branch);
      await existing.save();
      return res.response({ success: true, message: 'Bank account updated', data: existing }).code(200);
    }

    const bankAccount = await DoctorBankAccounts.create({
      doctor_id,
      account_holder_name: await encryptText(holderName),
      account_number: await encryptText(accNumber),
      ifsc_code: await encryptText(ifsc),
      bank_name: await encryptText(bank),
      branch_name: await encryptText(branch),
    });

    return res.response({ success: true, message: 'Bank account added', data: bankAccount }).code(201);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message || 'Something went wrong' }).code(500);
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
    return res.response({ success: false, message: err.message || 'Something went wrong' }).code(200);
  }
};

const updateBankAccount = async (req, res) => {
  try {
    const user = req.headers.user;
    const doctor_id = user.doctor_id;
    const { account_holder_name, account_number, ifsc_code, bank_name, branch_name } = req.payload;

    let bankAccount = await DoctorBankAccounts.findOne({ where: { doctor_id } });

    if (bankAccount) {
      // Update existing
      bankAccount.account_holder_name = await encryptText(account_holder_name || await decryptText(bankAccount.account_holder_name));
      bankAccount.account_number = await encryptText(account_number || await decryptText(bankAccount.account_number));
      bankAccount.ifsc_code = await encryptText(ifsc_code || await decryptText(bankAccount.ifsc_code));
      bankAccount.bank_name = await encryptText(bank_name || await decryptText(bankAccount.bank_name));
      bankAccount.branch_name = await encryptText(branch_name || await decryptText(bankAccount.branch_name));
      await bankAccount.save();
    } else {
      // Create new if not exists
      bankAccount = await DoctorBankAccounts.create({
        doctor_id,
        account_holder_name: await encryptText(account_holder_name),
        account_number: await encryptText(account_number),
        ifsc_code: await encryptText(ifsc_code),
        bank_name: bank_name ? await encryptText(bank_name) : null,
        branch_name: branch_name ? await encryptText(branch_name) : null,
      });
    }

    return res.response({ success: true, message: 'Bank account saved', data: bankAccount }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message || 'Something went wrong' }).code(500);
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
    return res.response({ success: false, message: err.message || 'Something went wrong' }).code(200);
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
    return res.response({ success: false, message: err.message || 'Something went wrong' }).code(200);
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
    return res.response({ success: false, message: err.message || 'Something went wrong' }).code(200);
  }
};

const calculatePayouts = async (req, res) => {
  try {
    const session_user = req.headers.user;
    if (!session_user || session_user.role !== 'ADMIN') return res.response({ success: false, message: 'Unauthorized' }).code(401);

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
        payout_id: null,
        payout_processed: false,
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

    const payoutData = [];

    for (const appointment of appointments) {
      // Check for duplicate payout already existing for this doctor + date range
      const existingPayout = await Payouts.findOne({
        where: {
          doctor_id: appointment.doctor_id,
          from_date: startDate,
          to_date: endDate,
          status: 'pending'
        }
      });
      if (existingPayout) continue; // skip — already calculated

      const totalEarnings = Number(appointment.get('total_consultation_fee'));

      const platformFeeAmount =
        (totalEarnings * platformFeePercentage) / 100;

      const gstAmount =
        (platformFeeAmount * gstPercentage) / 100;

      const totalDeductions =
        platformFeeAmount + gstAmount;

      const netPayout =
        totalEarnings - totalDeductions;

      const payout = await Payouts.create({
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
        processed_by: session_user.id, // Logged in admin id
        razorpay_payout_id: null,
        utr: null,
        from_date: startDate,
        to_date: endDate,
        processed_at: null,
      })
      await Appointments.update({
        payout_id: payout.id,
      }, {
        where: {
          doctor_id: appointment.doctor_id,
          appointment_date: {
            [Op.between]: [startDate, endDate],
          },
          status: 'completed',
          payment_status: 'paid',
          ...where,
        }
      });

      // Notify doctor about calculated payout
      NotificationHelper.sendToDoctor(appointment.doctor_id,
        'Payout Calculated',
        `Your payout of ₹${netPayout} for ${startDate} to ${endDate} has been calculated and is pending processing.`,
        { payout_id: payout.id, net_payout: netPayout, from_date: startDate, to_date: endDate }
      );

      payoutData.push({
        doctor_id: appointment.doctor_id,
        total_earnings: totalEarnings,
        platform_fee_percentage: platformFeePercentage,
        platform_fee_amount: platformFeeAmount,
        gst_percentage: gstPercentage,
        gst_amount: gstAmount,
        total_deductions: totalDeductions,
        net_payout: netPayout,
        status: 'pending',
        from_date: startDate,
        to_date: endDate,
      });
    }

    return res.response({ success: true, message: 'Payouts calculated', data: payoutData }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message || 'Something went wrong' }).code(200);
  }
};

const getAdminPayouts = async (req, res) => {
  try {
    const session_user = req.headers.user;
    if (!session_user || session_user.role !== 'ADMIN') return res.response({ success: false, message: 'Unauthorized' }).code(401);

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
    return res.response({ success: false, message: err.message || 'Something went wrong' }).code(200);
  }
};

const getDoctorPayouts = async (req, res) => {
  try {
    const user = req.headers.user;
    const doctor_id = user.doctor_id;

    const payouts = await Payouts.findAll({
      where: { doctor_id },
      include: [{ model: Doctors, attributes: ['id', 'full_name', 'email', 'phone'] }],
      order: [['createdAt', 'DESC']]
    });

    const totalPaid = payouts
      .filter(p => p.status === 'processed')
      .reduce((sum, p) => sum + Number(p.net_payout), 0);

    const totalPending = payouts
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + Number(p.net_payout), 0);

    return res.response({
      success: true,
      message: 'Your payouts fetched',
      data: { payouts, totalPaid, totalPending }
    }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message || 'Something went wrong' }).code(500);
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
          payout_id: null,
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
    return res.response({ success: false, message: err.message || 'Something went wrong' }).code(200);
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

    const payout = await Payouts.findOne({
      where: {
        doctor_id,
        from_date,
        to_date
      }
    });

    if (!payout) throw new Error('Payout not found');
    if (payout.status === 'processed') throw new Error('Payout is already marked as paid');

    payout.status = 'processed';
    payout.comment = comment || null;
    payout.transaction_id = transaction_id;
    payout.processed_by = session_user.id;
    payout.processed_at = new Date();

    await payout.save();

    await Appointments.update(
      { payout_processed: true },
      { where: { payout_id: payout.id } }
    );

    // Notify doctor about payout
    NotificationHelper.sendToDoctor(doctor_id,
      'Payout Processed',
      `Your payout of ₹${payout.net_payout} for ${payout.from_date} to ${payout.to_date} has been processed. Transaction ID: ${transaction_id}`,
      { payout_id: payout.id, net_payout: payout.net_payout, transaction_id }
    );

    // Earnings milestone check
    const doctor = await Doctors.findByPk(doctor_id, { raw: true });
    if (doctor) {
      const totalEarnings = Number(doctor.total_earnings) || 0;
      const milestones = [10000, 25000, 50000, 100000, 250000, 500000, 1000000];
      for (const milestone of milestones) {
        if (totalEarnings >= milestone && totalEarnings - payout.net_payout < milestone) {
          NotificationHelper.sendToDoctor(doctor_id,
            'Earnings Milestone!',
            `Congratulations! You have crossed ₹${milestone.toLocaleString('en-IN')} in total earnings on Velvets Care. Keep up the great work!`,
            { milestone, total_earnings: totalEarnings }
          );
          break;
        }
      }
    }

    return res.response({
      success: true,
      message: 'Payout marked as paid successfully',
      data: payout
    }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message || 'Something went wrong' }).code(500);
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
    return res.response({ success: false, message: err.message || 'Something went wrong' }).code(500);
  }
};

const getDoctorEarnings = async (req, res) => {
  try {
    const user = req.headers.user;
    const doctor_id = user.doctor_id;

    // 1️⃣ All-time totals from completed+paid appointments
    const allTimeEarnings = await Appointments.findAll({
      where: { doctor_id, status: 'completed', payment_status: 'paid' },
      attributes: [
        [fn('SUM', col('consultation_fee')), 'total_earnings'],
        [fn('COUNT', col('id')), 'total_appointments'],
      ],
      raw: true,
    });

    // 2️⃣ Pending earnings (not yet in any payout)
    const pendingEarnings = await Appointments.findAll({
      where: { doctor_id, status: 'completed', payment_status: 'paid', payout_id: null },
      attributes: [
        [fn('SUM', col('consultation_fee')), 'pending_earnings'],
        [fn('COUNT', col('id')), 'pending_appointments'],
      ],
      raw: true,
    });

    // 3️⃣ Total paid out via processed payouts
    const paidOut = await Payouts.findAll({
      where: { doctor_id, status: 'processed' },
      attributes: [
        [fn('SUM', col('net_payout')), 'total_paid_out'],
      ],
      raw: true,
    });

    // 4️⃣ Pending payouts (calculated but not paid)
    const pendingPayouts = await Payouts.findAll({
      where: { doctor_id, status: 'pending' },
      attributes: [
        [fn('SUM', col('net_payout')), 'total_pending_payout'],
      ],
      raw: true,
    });

    // 5️⃣ Recent transactions (last 20 appointments)
    const recentTransactions = await Appointments.findAll({
      where: { doctor_id, status: 'completed', payment_status: 'paid' },
      attributes: ['id', 'appointment_date', 'appointment_time', 'consultation_fee', 'payment_id', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 20,
      raw: true,
    });

    // 6️⃣ Monthly earnings breakdown (last 12 months)
    const monthlyEarnings = await Appointments.findAll({
      where: {
        doctor_id,
        status: 'completed',
        payment_status: 'paid',
      },
      attributes: [
        [Sequelize.fn('DATE_FORMAT', col('appointment_date'), '%Y-%m'), 'month'],
        [fn('SUM', col('consultation_fee')), 'earnings'],
        [fn('COUNT', col('id')), 'appointments'],
      ],
      group: [Sequelize.fn('DATE_FORMAT', col('appointment_date'), '%Y-%m')],
      order: [[Sequelize.fn('DATE_FORMAT', col('appointment_date'), '%Y-%m'), 'DESC']],
      limit: 12,
      raw: true,
    });

    return res.response({
      success: true,
      message: 'Doctor earnings fetched',
      data: {
        summary: {
          total_earnings: Number(allTimeEarnings[0]?.total_earnings) || 0,
          total_appointments: Number(allTimeEarnings[0]?.total_appointments) || 0,
          pending_earnings: Number(pendingEarnings[0]?.pending_earnings) || 0,
          pending_appointments: Number(pendingEarnings[0]?.pending_appointments) || 0,
          total_paid_out: Number(paidOut[0]?.total_paid_out) || 0,
          total_pending_payout: Number(pendingPayouts[0]?.total_pending_payout) || 0,
        },
        recent_transactions: recentTransactions,
        monthly_earnings: monthlyEarnings,
      }
    }).code(200);
  } catch (err) {
    console.error(err);
    return res.response({ success: false, message: err.message || 'Something went wrong' }).code(500);
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
  getPayoutHistory,
  getDoctorEarnings
};
