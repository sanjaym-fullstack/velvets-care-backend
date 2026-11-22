const { Users, Doctors, Accounts } = require('../models');

// Strip a leading +country code, then keep digits only so storage and
// lookups always agree: "+91 98765 43210", "919876543210",
// "09876543210" and "98765 43210" all become "9876543210".
const normalizePhone = (phone) => {
    if (!phone) return phone;
    let digits = String(phone)
        .replace(/^(\+91|\+1|\+44|\+81|\+86|\+49|\+33|\+61|\+82|\+7|\+55)\s*/, '')
        .replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    return digits;
};

const isValidPhone = (phone) => /^[6-9]\d{9}$/.test(phone);

const MSG_ALREADY_DOCTOR = 'This phone number is already registered as a doctor';
const MSG_ALREADY_USER = 'This phone number is already registered as a user';

// Cross-role blockers: does this phone already belong to the other role?
const isDoctorPhone = async (phone) => {
    const doctor = await Doctors.findOne({ where: { phone }, attributes: ['id'], raw: true });
    return !!doctor;
};

const isUserPhone = async (phone) => {
    const user = await Users.findOne({ where: { phone }, attributes: ['id'], raw: true });
    return !!user;
};

// Find-or-create the central account row for a phone. Never throws: if the
// accounts table is missing (migration not run yet) or the phone is not a
// valid number, it logs and returns null so login/register keep working.
const ensureAccount = async (phone) => {
    if (!phone || !isValidPhone(phone)) return null;
    try {
        const [account] = await Accounts.findOrCreate({ where: { phone }, defaults: { phone } });
        return account;
    } catch (error) {
        try {
            const existing = await Accounts.findOne({ where: { phone }, raw: true });
            if (existing) return existing;
        } catch (secondError) {
            // fall through to the log below
        }
        console.error('ensureAccount failed:', error.message);
        return null;
    }
};

module.exports = {
    normalizePhone,
    isValidPhone,
    isDoctorPhone,
    isUserPhone,
    ensureAccount,
    MSG_ALREADY_DOCTOR,
    MSG_ALREADY_USER,
};
