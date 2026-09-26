const {
    Files,
    Appointments,
    Users,
    Doctors,
    Doctorsavailability,
    Specialization

} = require('../models')
const {
    Op
} = require('sequelize')
const {
    FileFunctions, JWTFunctions, RazorpayFunctions, AgoraFunctions, NotificationHelper, GoogleCalendarHelper, stripSensitive, normalizeFee
} = require('../helpers');
const { refundPayment } = require('../helpers/razorpay');
const Razorpay = require('razorpay');
require('dotenv/config');
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET
});

const normalizeDate = (dateStr) => {
    // Handle MM/DD/YYYY or DD/MM/YYYY
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        // If first part > 12, it's DD/MM/YYYY, otherwise assume MM/DD/YYYY
        if (parseInt(parts[0]) > 12) {
            const [day, month, year] = parts;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else {
            const [month, day, year] = parts;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
    }
    // Handle DD-MM-YYYY or MM-DD-YYYY
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
        const parts = dateStr.split('-');
        // If first part > 12, it's DD-MM-YYYY, otherwise assume MM-DD-YYYY
        if (parseInt(parts[0]) > 12) {
            const [day, month, year] = parts;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        const [month, day, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    // Handle YYYY-MM-DD or other formats
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Parse any date format to a Date object using normalizeDate first
const parseAnyDate = (dateStr) => {
    const normalized = normalizeDate(dateStr);
    return new Date(normalized + 'T00:00:00');
};

// Convert any time string to 24h number (e.g., "3:00 PM" → 1500, "18:00" → 1800, "10:00 AM" → 1000)
const to24Hour = (timeStr) => {
    const hasAMPM = /[AP]M/i.test(timeStr);
    const num = parseInt(timeStr.replace(/[:\s]/g, '').replace(/[APap][Mm]/g, ''));
    if (!hasAMPM) return num; // already 24h format like "10:00" or "18:00"
    const isPM = /PM/i.test(timeStr);
    let val = num;
    if (isPM && val < 1200) val += 1200;
    if (!isPM && val === 1200) val = 0; // 12:00 AM → 0
    return val;
};


const precheckAndCreateOrder = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');
        const { doctor_id, appointment_date, appointment_time } = req.payload;
        if (new Date(normalizeDate(appointment_date)) < new Date(normalizeDate(new Date().toISOString()))) throw new Error('Booking for past date is not allowed');
        const user = await Users.findOne({ where: { id: session_user.user_id } });
        const doctor = await Doctors.findOne({
            where:
                { id: doctor_id },
            raw: true
        });
        if (!user || !doctor) throw new Error('Invalid user or doctor');

        const appointmentDate = parseAnyDate(appointment_date);
        const appointmentDay = appointmentDate.toLocaleDateString('en-IN', { weekday: 'long' });
        const availability = await Doctorsavailability.findOne({
            where: {
                doctor_id,
                day: appointmentDay
            }
        });
        if (!availability) throw new Error('Doctor is not available on this day');
        const AMPM = appointment_time.includes('AM') ? 'AM' : 'PM';
        const time = appointment_time.split(' ')[0];

        // Convert all to 24h for proper comparison
        const req24 = to24Hour(appointment_time);
        const start24 = to24Hour(availability.start_time);
        const end24 = to24Hour(availability.end_time);

        if (req24 < start24 || req24 >= end24) {
            throw new Error(`Doctor is available from ${availability.start_time} to ${availability.end_time}. Please select a time within this window.`);
        }
        const existingAppointment = await Appointments.findOne({
            where: {
                doctor_id,
                appointment_date: { [Op.like]: `${normalizeDate(appointment_date)}%` },
                appointment_time
            }
        });

        if (existingAppointment) throw new Error('Slot already booked');
        const amount = doctor.consultation_fee || 500;
        const order = await RazorpayFunctions.createRazorpayOrder(amount);

        return res.response({
            success: true,
            message: 'Doctor available. Proceed to payment.',
            data: order
        });
    } catch (error) {
        console.log(error);
        return res.response({ success: false, message: error.message || 'Something went wrong' }).code(200);
    }
};

const confirmAppointment = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const {
            doctor_id,
            appointment_date,
            appointment_time,
            reason,
            status,
            order_id,
            payment_id,
            payment_signature,
            consultation_modes
        } = req.payload;

        const doctor = await Doctors.findOne({ where: { id: doctor_id } });
        const fee = doctor.consultation_fee || 500;

        const appointment = await Appointments.create({
            doctor_id,
            patient_id: session_user.user_id,
            appointment_date: normalizeDate(appointment_date),
            appointment_time,
            reason,
            status: 'pending',
            payment_id,
            order_id,
            payment_signature,
            payment_status: 'paid',
            consultation_fee: fee,
            consultation_modes
        });

        await Doctors.update(
            { total_earnings: (doctor.total_earnings || 0) + fee },
            { where: { id: doctor_id } }
        );

        const patient = await Users.findByPk(session_user.user_id);
        NotificationHelper.sendToUser(session_user.user_id,
            'Appointment Booked',
            `Your appointment with Dr. ${doctor.full_name} on ${appointment_date} at ${appointment_time} has been booked.`,
            { appointment_id: appointment.id }
        );
        NotificationHelper.sendToDoctor(doctor_id,
            'New Appointment',
            `New appointment booked by ${patient?.name || 'a patient'} on ${appointment_date} at ${appointment_time}.`,
            { appointment_id: appointment.id }
        );

        GoogleCalendarHelper.createCalendarEvent(appointment, doctor, patient).catch(e =>
            console.error('Google Calendar event creation failed (non-blocking):', e.message)
        );

        return res.response({
            success: true,
            message: 'Appointment booked successfully',
            data: appointment
        });
    } catch (error) {
        console.log(error);
        return res.response({
            success: false,
            message: error.message || 'Something went wrong'
        }).code(200);
    }
};


const getDoctorAppointments = async (req, h) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const doctor_id = session_user.doctor_id;
        if (!doctor_id) throw new Error('Doctor ID is required');

        /* -------------------------------
           FETCH APPOINTMENTS
        -------------------------------- */
        const appointments = await Appointments.findAll({
            where: { doctor_id },
            include: [
                {
                    model: Users,
                    attributes: { exclude: ['access_token', 'refresh_token'] },
                    include: [{ model: Files }]
                }
            ],
            order: [['appointment_date', 'ASC'], ['appointment_time', 'ASC']],
            raw: true,
            nest: true
        });

        const categorized = {
            new: [],
            upcoming: [],
            history: []
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        /* -------------------------------
           ENRICH + CATEGORIZE
        -------------------------------- */
        for (const appt of appointments) {

            const profile_image_url = appt.user?.file?.files_url
                ? await FileFunctions.getFromS3(appt.user.file.files_url)
                : null;

            const enriched = {
                ...appt,
                user: {
                    ...appt.user,
                    profile_image_url,
                    file: appt.user?.file ? {
                        ...appt.user.file,
                        files_url: profile_image_url || appt.user.file.files_url
                    } : appt.user?.file
                }
            };

            const apptDate = new Date(appt.appointment_date);
            apptDate.setHours(0, 0, 0, 0);

            const status = appt.status; // e.g. PENDING, APPROVED, COMPLETED, CANCELLED

            /* -------------------------------
               HISTORY
               - Date crossed
               - OR completed / cancelled
            -------------------------------- */
            if (
                apptDate < today ||
                ['COMPLETED', 'CANCELLED'].includes(status)
            ) {
                categorized.history.push(enriched);
                continue;
            }

            /* -------------------------------
               NEW (NOT APPROVED)
            -------------------------------- */
            if (status !== 'APPROVED') {
                categorized.new.push(enriched);
                continue;
            }

            /* -------------------------------
               UPCOMING (APPROVED + FUTURE/TODAY)
            -------------------------------- */
            categorized.upcoming.push(enriched);
        }

        return h.response({
            success: true,
            message: 'Doctor appointments fetched successfully',
            data: categorized
        }).code(200);

    } catch (error) {
        console.error('Fetch doctor appointments error:', error);
        return h.response({
            success: false,
            message: error.message || 'Something went wrong'
        }).code(500);
    }
};



const DoctorApproval = async (req, h) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const appointmentId = req.params.id;
        const appointment = await Appointments.findByPk(appointmentId);
        if (!appointment) {
            throw new Error('Appointment not found');
        }
        let doctor_id = null;
        if (session_user.role !== 'ADMIN') {
            doctor_id = session_user.doctor_id;
            if (appointment.doctor_id !== doctor_id) {
                throw new Error('Unauthorized: This is not your appointment');
            }
        } else {
            doctor_id = appointment.doctor_id;
        }
        if (appointment.status !== 'pending') {
            throw new Error(`Only pending appointments can be approved. Current status: ${appointment.status}`);
        }
        // Update status to approved
        const updatedAppointment = await Appointments.update({
            status: 'approved'
        }, { where: { id: appointmentId } });

        NotificationHelper.sendToUser(appointment.patient_id,
            'Appointment Approved',
            `Your appointment on ${appointment.appointment_date} at ${appointment.appointment_time} has been approved.`,
            { appointment_id: appointment.id }
        );

        NotificationHelper.sendToDoctor(appointment.doctor_id,
            'Appointment Approved',
            `You have approved the appointment on ${appointment.appointment_date} at ${appointment.appointment_time}.`,
            { appointment_id: appointment.id }
        );

        return h.response({
            success: true,
            message: 'Appointment approved successfully',
            data: updatedAppointment
        });
    } catch (error) {
        console.error(error);
        return h.response({
            success: false,
            message: error.message || 'Something went wrong'
        }).code(200);
    }
};

const UpdateAppointmentStatus = async (req, h) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const doctor_id = session_user.doctor_id;
        const { appointmentId } = req.params;
        const { status } = req.payload;

        const appointment = await Appointments.findByPk(appointmentId);
        if (!appointment) {
            throw new Error('Appointment not found');
        }
        if (session_user.role !== 'ADMIN' && appointment.doctor_id !== doctor_id) {
            throw new Error('Unauthorized: This is not your appointment');
        }
        if (appointment.status !== 'approved') {
            throw new Error(`Only approved appointments can have status updated. Current status: ${appointment.status}`);
        }
        if (!['completed', 'no_show'].includes(status)) {
            throw new Error('Invalid status. Allowed values are: completed, no_show');
        }
        // Update status
        await appointment.update({ status });

        if (status === 'completed') {
            NotificationHelper.sendToUser(appointment.patient_id,
                'Appointment Completed',
                `Your appointment on ${appointment.appointment_date} at ${appointment.appointment_time} has been marked as completed.`,
                { appointment_id: appointment.id }
            );
            NotificationHelper.sendToDoctor(appointment.doctor_id,
                'Appointment Completed',
                `Your appointment on ${appointment.appointment_date} at ${appointment.appointment_time} has been marked as completed.`,
                { appointment_id: appointment.id }
            );
        } else if (status === 'no_show') {
            NotificationHelper.sendToUser(appointment.patient_id,
                'Missed Appointment',
                `You missed your appointment on ${appointment.appointment_date} at ${appointment.appointment_time}. Please reschedule.`,
                { appointment_id: appointment.id }
            );
            NotificationHelper.sendToDoctor(appointment.doctor_id,
                'Patient No-Show',
                `The patient did not attend the appointment on ${appointment.appointment_date} at ${appointment.appointment_time}.`,
                { appointment_id: appointment.id }
            );
        }

        return h.response({
            success: true,
            message: 'Appointment status updated successfully',
            data: appointment
        });
    } catch (error) {
        console.error(error);
        return h.response({
            success: false,
            message: error.message || 'Something went wrong'
        }).code(200);
    }
};

const doctoreject = async (req, h) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const appointmentId = req.params.id;
        const { cancel_reason } = req.payload;

        const appointment = await Appointments.findByPk(appointmentId);
        if (!appointment) {
            throw new Error('Appointment not found');
        }

        let doctor_id = null;
        if (session_user.role !== 'ADMIN') {
            doctor_id = session_user.doctor_id;
            if (appointment.doctor_id !== doctor_id) {
                throw new Error('Unauthorized: This is not your appointment');
            }
        } else {
            doctor_id = appointment.doctor_id;
        }

        if (appointment.status !== 'pending') {
            throw new Error(`Only pending appointments can be rejected. Current status: ${appointment.status}`);
        }

        // Calculate refund - doctor rejection gets 100% refund
        let refundAmount = 0;
        let refundStatus = null;
        let refundId = null;

        if (appointment.payment_status === 'paid' && appointment.payment_id) {
            refundAmount = normalizeFee(appointment.consultation_fee);

            // Process full refund via Razorpay
            if (refundAmount > 0) {
                try {
                    const refund = await refundPayment(appointment.payment_id, refundAmount, {
                        reason: cancel_reason || 'Doctor rejected appointment',
                        appointment_id: appointment.id
                    });
                    refundId = refund.id;
                    refundStatus = refund.status || 'processed';
                    // Use actual amount refunded by Razorpay (in rupees)
                    refundAmount = refund.refund_amount_rupees || refundAmount;
                } catch (refundErr) {
                    console.error('Refund failed:', refundErr.message);
                    refundStatus = 'failed';
                }
            }
        }

        // Update status to rejected
        await appointment.update({
            status: 'rejected',
            cancel_reason,
            cancel_by: 'doctor',
            refund_id: refundId,
            refund_amount: refundAmount,
            refund_status: refundStatus,
            refund_date: refundAmount > 0 ? new Date() : null,
            refund_reason: cancel_reason
        });

        GoogleCalendarHelper.deleteCalendarEvents(appointment.id).catch(e =>
            console.error('Google Calendar event deletion failed (non-blocking):', e.message)
        );

        // Notify user about rejection + refund
        if (refundAmount > 0 && refundStatus === 'processed') {
            NotificationHelper.sendToUser(appointment.patient_id,
                'Appointment Rejected - Refund Initiated',
                `Your appointment on ${appointment.appointment_date} at ${appointment.appointment_time} was rejected by the doctor. Full refund of ₹${refundAmount} has been initiated.`,
                { appointment_id: appointment.id, refund_amount: refundAmount, refund_id: refundId }
            );
        } else {
            NotificationHelper.sendToUser(appointment.patient_id,
                'Appointment Rejected',
                `Your appointment on ${appointment.appointment_date} at ${appointment.appointment_time} has been rejected. Reason: ${cancel_reason || 'N/A'}`,
                { appointment_id: appointment.id }
            );
        }

        return h.response({
            success: true,
            message: 'Appointment rejected successfully',
            data: appointment
        });
    } catch (error) {
        console.error(error);
        return h.response({
            success: false,
            message: error.message || 'Something went wrong'
        }).code(200);
    }
}

const cancelAppointmentByUser = async (req, h) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');


        const appointmentId = req.params.id;
        const { cancel_reason } = req.payload;
        const appointment = await Appointments.findByPk(appointmentId);
        if (!appointment) {
            throw new Error('Appointment not found');
        }

        let user_id = null;

        if (session_user.role !== 'ADMIN') {
            user_id = session_user.user_id;
        } else {
            user_id = appointment.patient_id;
        }

        if (appointment.patient_id !== user_id) {
            throw new Error('Unauthorized: This is not your appointment');
        }

        // Prevent canceling on the same day
        const today = normalizeDate(new Date().toISOString());
        if (appointment.appointment_date === today) {
            throw new Error('Cannot cancel appointment on the same day');
        }

        // Prevent duplicate cancellation
        if (appointment.status === 'cancelled') {
            throw new Error('Appointment is already cancelled');
        }

        // Calculate refund based on timing
        let refundAmount = 0;
        let refundStatus = null;
        let refundId = null;

        if (appointment.payment_status === 'paid' && appointment.payment_id) {
            const fee = normalizeFee(appointment.consultation_fee);

            // Calculate days/hours before appointment
            const apptDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
            const now = new Date();
            const hoursUntil = (apptDateTime - now) / (1000 * 60 * 60);

            if (hoursUntil >= 24) {
                // 24hr+ before: 90% refund (platform keeps 10% commission)
                refundAmount = Math.round(fee * 0.9 * 100) / 100;
            } else if (hoursUntil > 0) {
                // <24hr before: 50% refund
                refundAmount = Math.round(fee * 0.5 * 100) / 100;
            } else {
                // Past appointment: no refund
                refundAmount = 0;
            }

            // Process refund via Razorpay
            if (refundAmount > 0) {
                try {
                    const refund = await refundPayment(appointment.payment_id, refundAmount, {
                        reason: cancel_reason || 'Patient cancelled appointment',
                        appointment_id: appointment.id
                    });
                    refundId = refund.id;
                    refundStatus = refund.status || 'processed';
                    // Use actual amount refunded by Razorpay (in rupees)
                    refundAmount = refund.refund_amount_rupees || refundAmount;
                } catch (refundErr) {
                    console.error('Refund failed:', refundErr.message);
                    refundStatus = 'failed';
                }
            }
        }

        // Cancel the appointment
        await appointment.update({
            status: 'cancelled',
            cancel_reason: cancel_reason,
            cancel_by: 'patient',
            refund_id: refundId,
            refund_amount: refundAmount,
            refund_status: refundStatus,
            refund_date: refundAmount > 0 ? new Date() : null,
            refund_reason: cancel_reason
        });

        GoogleCalendarHelper.deleteCalendarEvents(appointment.id).catch(e =>
            console.error('Google Calendar event deletion failed (non-blocking):', e.message)
        );

        // Notify doctor
        NotificationHelper.sendToDoctor(appointment.doctor_id,
            'Appointment Cancelled',
            `An appointment on ${appointment.appointment_date} at ${appointment.appointment_time} has been cancelled by the patient. Reason: ${cancel_reason || 'N/A'}`,
            { appointment_id: appointment.id }
        );

        // Notify user about refund (only send here for immediate refund; webhook will handle async confirmations)
        if (refundAmount > 0 && refundStatus === 'processed') {
            NotificationHelper.sendToUser(user_id,
                'Refund Initiated',
                `Your refund of ₹${refundAmount} for appointment #${appointment.id} has been initiated. It will be credited in 5-7 business days.`,
                { appointment_id: appointment.id, refund_amount: refundAmount, refund_id: refundId }
            );
        } else if (refundAmount === 0) {
            NotificationHelper.sendToUser(user_id,
                'Appointment Cancelled',
                `Your appointment #${appointment.id} has been cancelled. No refund applicable as per cancellation policy.`,
                { appointment_id: appointment.id }
            );
        }

        return h.response({
            success: true,
            message: refundAmount > 0 ? `Appointment cancelled. Refund of ₹${refundAmount} initiated.` : 'Appointment cancelled. No refund applicable.',
            data: {
                ...appointment.toJSON(),
                refund: refundAmount > 0 ? { refund_id: refundId, refund_amount: refundAmount, refund_status: refundStatus } : null
            }
        });

    } catch (error) {
        console.error(error);
        return h.response({
            success: false,
            message: error.message || 'Something went wrong'
        }).code(500);
    }
};

const getadminAppointments = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { page, limit, searchquery, doctor_id, status, date, patient_id } = req.query;
        if (!page || !limit) throw new Error('Page and limit are required');

        let filter = {};
        if (doctor_id) filter.doctor_id = doctor_id;
        if (status) filter.status = status;
        if (patient_id) filter.patient_id = patient_id;
        if (date) {
            const normalizedDate = normalizeDate(date);
            filter.appointment_date = { [Op.like]: `${normalizedDate}%` };
        }

        const total_count = await Appointments.count({ where: filter });

        // Paginated page data
        const appointments = await Appointments.findAll({
            where: filter,
            limit: parseInt(limit),
            offset: (page - 1) * limit,
            order: [['appointment_date', 'DESC'], ['appointment_time', 'DESC']],
            include: [
                { model: Users, attributes: ['id', 'name', 'email', 'phone'], include: [{ model: Files }] },
                {
                    model: Doctors,
                    attributes: { exclude: ['access_token', 'otp_id', 'refresh_token'] },
                    include: [
                        { model: Files, as: 'profile_image' },
                        { model: Specialization }
                    ]
                }
            ]
        });

        // Full filtered dataset (unpaginated) for static categorization
        const allAppointments = await Appointments.findAll({
            where: filter,
            order: [['appointment_date', 'DESC'], ['appointment_time', 'DESC']],
            include: [
                { model: Users, attributes: ['id', 'name', 'email', 'phone'], include: [{ model: Files }] },
                {
                    model: Doctors,
                    attributes: { exclude: ['access_token', 'otp_id', 'refresh_token'] },
                    include: [
                        { model: Files, as: 'profile_image' },
                        { model: Specialization }
                    ]
                }
            ]
        });

        // Map S3 URLs for doctor profile images
        const mapDoctorImages = async (apptList) =>
            Promise.all(
                apptList.map(async appt => {
                    const doctorData = { ...appt.Doctor?.dataValues };
                    const profileImage = appt.Doctor?.profile_image;

                    if (profileImage?.files_url) {
                        doctorData.profile_image_url = await FileFunctions.getFromS3(
                            profileImage.files_url
                        );
                        doctorData.profile_image = {
                            ...profileImage.dataValues || profileImage,
                            files_url: doctorData.profile_image_url
                        };
                    } else {
                        doctorData.profile_image_url = null;
                    }

                    return {
                        ...appt.dataValues,
                        Doctor: doctorData
                    };
                })
            );

        const appointmentsWithImages = await mapDoctorImages(appointments);
        const allAppointmentsWithImages = await mapDoctorImages(allAppointments);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const categorized = {
            all: [],
            upcoming: [],
            completed: [],
            cancelled: [],
            pending: [],
            approved: []
        };

        allAppointmentsWithImages.forEach(appt => {
            categorized.all.push(appt);

            const apptDate = new Date(appt.appointment_date);
            const apptStatus = appt.status?.toLowerCase();

            switch (apptStatus) {
                case 'completed':
                    categorized.completed.push(appt);
                    break;
                case 'cancelled':
                    categorized.cancelled.push(appt);
                    break;
                case 'pending':
                    categorized.pending.push(appt);
                    if (apptDate >= today) categorized.upcoming.push(appt);
                    break;
                case 'approved':
                    categorized.approved.push(appt);
                    if (apptDate >= today) categorized.upcoming.push(appt);
                    break;
                default:
                    if (apptDate >= today) categorized.upcoming.push(appt);
                    break;
            }
        });

        return res.response({
            success: true,
            message: 'Appointments fetched and categorized successfully',
            data: {
                paginated: appointmentsWithImages,
                total: total_count,
                page: parseInt(page),
                limit: parseInt(limit),
                categorized
            }
        }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({
            success: false,
            message: error.message || 'Something went wrong'
        }).code(500);
    }
};

const getRtcToken = async (req, h) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const appointmentId = req.params.id;
        const userId = session_user.doctor_id || session_user.user_id; // Use doctor_id for doctors, user_id for patients

        const appointment = await Appointments.findByPk(appointmentId);
        if (!appointment) throw new Error('Appointment not found');
        if (appointment.status !== 'approved') throw new Error('Appointment not approved');

        if (![appointment.doctor_id, appointment.patient_id].includes(userId)) {
            throw new Error('Unauthorized access');
        }

        const channelName = `appointment_${appointmentId}`;
        const token = AgoraFunctions.generateRtcToken(channelName, userId);

        return h.response({
            success: true,
            token,
            channelName,
            uid: userId,
            consultation_mode: appointment.consultation_mode
        });

    } catch (err) {
        console.error(err);
        return h.response({
            success: false,
            message: err.message || 'Something went wrong'
        });
    }
};

const getUserAppointments = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const user_id = session_user.user_id;

        const user_count = await Appointments.count({ where: { patient_id: user_id } });

        const appointments = await Appointments.findAll({
            where: { patient_id: user_id },
            include: [
                {
                    model: Doctors,
                    attributes: { exclude: ['access_token', 'refresh_token'] },
                    include: [{ model: Files, as: 'profile_image' }, { model: Specialization }]
                }
            ],
            order: [['appointment_date', 'ASC'], ['appointment_time', 'ASC']],
        });

        // Map S3 URLs for doctor profile images
        const appointmentsWithImages = await Promise.all(
            appointments.map(async appt => {
                const doctorData = { ...appt.Doctor?.dataValues };
                const profileImage = appt.Doctor?.profile_image;

                if (profileImage?.files_url) {
                    doctorData.profile_image_url = await FileFunctions.getFromS3(
                        profileImage.files_url
                    );
                    doctorData.profile_image = {
                        ...profileImage.dataValues || profileImage,
                        files_url: doctorData.profile_image_url
                    };
                } else {
                    doctorData.profile_image_url = null;
                }

                return {
                    ...appt.dataValues,
                    Doctor: doctorData
                };
            })
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Categorize appointments
        const categorized = {
            all: [],
            upcoming: [],
            completed: [],
            cancelled: [],
            pending: [],
            approved: []
        };

        appointmentsWithImages.forEach(appt => {
            categorized.all.push(appt);

            const apptDate = new Date(appt.appointment_date);
            const apptStatus = appt.status?.toLowerCase();

            switch (apptStatus) {
                case 'completed':
                    categorized.completed.push(appt);
                    break;
                case 'cancelled':
                    categorized.cancelled.push(appt);
                    break;
                case 'pending':
                    categorized.pending.push(appt);
                    if (apptDate >= today) categorized.upcoming.push(appt);
                    break;
                case 'approved':
                    categorized.approved.push(appt);
                    if (apptDate >= today) categorized.upcoming.push(appt);
                    break;
                default:
                    if (apptDate >= today) categorized.upcoming.push(appt);
                    break;
            }
        });

        return res.response({
            success: true,
            message: 'Appointments fetched and categorized successfully',
            data: {
                paginated: appointmentsWithImages,
                total: user_count,
                categorized
            }
        }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({
            success: false,
            message: error.message || 'Something went wrong'
        }).code(500);
    }
};

const checkDoctorAvailability = async (req, res) => {
    try {
        // 1️⃣  Auth / session
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        // 2️⃣  Validate payload
        const { doctor_id, appointment_date, appointment_time } = req.payload;
        if (!doctor_id || !appointment_date || !appointment_time) {
            throw new Error('doctor_id, appointment_date and appointment_time are required');
        }
        if (new Date(normalizeDate(appointment_date)) < new Date(normalizeDate(new Date().toISOString()))) {
            throw new Error('Booking for past date is not allowed');
        }

        // 3️⃣  Look‑ups
        const user = await Users.findByPk(session_user.user_id);
        const doctor = await Doctors.findByPk(doctor_id, { raw: true });
        if (!user || !doctor) throw new Error('Invalid user or doctor');

        // 4️⃣  Day / time translation
        const appointmentDate = parseAnyDate(appointment_date);
        const appointmentDay = appointmentDate.toLocaleDateString('en-IN', { weekday: 'long' });

        // 5️⃣  Doctor's weekly availability
        const availability = await Doctorsavailability.findOne({
            where: { doctor_id, day: appointmentDay }
        });
        if (!availability) throw new Error('Doctor is not available on this day');

        // Convert all to 24h for proper comparison
        const req24 = to24Hour(appointment_time);
        const start24 = to24Hour(availability.start_time);
        const end24 = to24Hour(availability.end_time);

        if (req24 < start24 || req24 >= end24) throw new Error(`Doctor is available from ${availability.start_time} to ${availability.end_time}. Please select a time within this window.`);

        // 6️⃣  Collision check
        const existing = await Appointments.findOne({
            where: { doctor_id, appointment_date: { [Op.like]: `${normalizeDate(appointment_date)}%` }, appointment_time }
        });
        if (existing) throw new Error('Slot already booked');

        // ✅  All good – return success
        return res.response({
            success: true,
            message: 'Doctor is available for this slot'
        });

    } catch (err) {
        console.log(err);
        return res.response({
            success: false,
            message: err.message || 'Something went wrong'
        }).code(200);
    }
};

const getDoctorAvailableTimeSlots = async (req, res) => {
    try {
        // 1️⃣ Auth
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        // 2️⃣ Payload validation
        const { doctor_id, appointment_date } = req.payload;
        if (!doctor_id || !appointment_date) {
            throw new Error('doctor_id and appointment_date are required');
        }

        // 3️⃣ Parse date safely
        const appointmentDate = parseAnyDate(appointment_date);
        const normalizedDate = normalizeDate(appointment_date);
        const todayNormalized = normalizeDate(new Date().toISOString());

        if (normalizedDate < todayNormalized) {
            throw new Error('Past date not allowed');
        }

        // 4️⃣ Lookups
        const user = await Users.findByPk(session_user.user_id);
        if (session_user.role != 'ADMIN' && !user) throw new Error('Invalid user')
        const doctor = await Doctors.findByPk(doctor_id, { raw: true });
        if (!doctor) throw new Error('Invalid doctor');

        // 5️⃣ Translate weekday
        const appointmentDay = appointmentDate.toLocaleDateString('en-IN', { weekday: 'long' });

        // 6️⃣ Get doctor availability
        const availability = await Doctorsavailability.findOne({
            where: { doctor_id, day: appointmentDay }
        });
        if (!availability) throw new Error('Doctor is not available on this day');

        const startTimeStr = availability.start_time;
        const endTimeStr = availability.end_time;

        // 7️⃣ Convert time string to date
        const timeToDate = (timeStr) => {
            const [time, modifier] = timeStr.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (modifier === 'PM' && hours !== 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            const date = new Date(appointmentDate);
            date.setHours(hours);
            date.setMinutes(minutes);
            date.setSeconds(0);
            return date;
        };

        const formatAMPM = (date) => {
            let hours = date.getHours();
            const minutes = date.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            const paddedMinutes = minutes.toString().padStart(2, '0');
            return `${hours}:${paddedMinutes} ${ampm}`;
        };

        const start = timeToDate(startTimeStr);
        const end = timeToDate(endTimeStr);

        // 8️⃣ Preload all booked appointments
        const allAppointments = await Appointments.findAll({
            where: {
                doctor_id,
                appointment_date: { [Op.like]: `${normalizeDate(appointment_date)}%` }
            },
            raw: true
        });
        const bookedTimes = new Set(allAppointments.map(a => a.appointment_time));

        // 9️⃣ Generate slots
        const slots = [];
        let current = new Date(start);
        while (current < end) {
            const next = new Date(current.getTime() + 30 * 60000);
            const slotStart = formatAMPM(current);
            const slotEnd = formatAMPM(next);

            slots.push({
                start: slotStart,
                end: slotEnd,
                is_available: !bookedTimes.has(slotStart)
            });

            current = next;
        }

        // 🔟 Final response
        return res.response({
            success: true,
            date: normalizeDate(appointment_date),
            day: appointmentDay,
            start_time: startTimeStr,
            end_time: endTimeStr,
            slots
        });

    } catch (err) {
        console.error(err);
        return res.response({
            success: false,
            message: err.message || 'Something went wrong'
        }).code(200);
    }
};

const getTodaysAppointmentsDoctor = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const doctor = await Doctors.findOne({ where: { id: session_user.doctor_id }, raw: true });
        if (!doctor) throw new Error('Invalid doctor');

        // Get today's date as normalized string (YYYY-MM-DD)
        const todayStr = normalizeDate(new Date().toISOString());

        const appointment = await Appointments.findAll({
            where: {
                doctor_id: doctor.id,
                appointment_date: { [Op.like]: `${todayStr}%` }
            },
            include: [
                {
                    model: Users,
                    attributes: { exclude: ['access_token', 'refresh_token', 'otp_id'] },
                    include: [{ model: Files }]
                }
            ],
            order: [['appointment_time', 'ASC']]
        });

        // Map user profile images to S3 URLs
        const appointments = await Promise.all(
            appointment.map(async appt => {
                const userData = { ...appt.User?.dataValues };

                if (userData.Files?.files_url) {
                    userData.profile_image_url = await FileFunctions.getFromS3(userData.Files.files_url);
                } else {
                    userData.profile_image_url = null;
                }

                return {
                    ...appt.dataValues,
                    User: userData
                };
            })
        );

        return res.response({
            success: true,
            message: 'Appointments fetched successfully',
            data: appointments
        }).code(200);

    } catch (err) {
        console.error(err);
        return res.response({
            success: false,
            message: err.message || 'Something went wrong'
        }).code(200);
    }
};



const adminCheckDoctorSlot = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user || session_user.role !== 'ADMIN') throw new Error('Unauthorized access');

        const { doctor_id, appointment_date, appointment_time } = req.payload;
        if (!doctor_id || !appointment_date || !appointment_time)
            throw new Error('doctor_id, appointment_date and appointment_time are required');

        const normalizedDate = normalizeDate(appointment_date);
        const todayNormalized = normalizeDate(new Date().toISOString());
        if (normalizedDate < todayNormalized)
            throw new Error('Booking for past date is not allowed');

        const doctor = await Doctors.findByPk(doctor_id);
        if (!doctor) throw new Error('Invalid doctor');

        // Convert date to day of week using parseAnyDate
        const appointmentDay = parseAnyDate(appointment_date).toLocaleDateString('en-IN', { weekday: 'long' });

        const availability = await Doctorsavailability.findOne({ where: { doctor_id, day: appointmentDay } });
        if (!availability) throw new Error('Doctor is not available on this day');

        // Convert all to 24h for proper comparison
        const req24 = to24Hour(appointment_time);
        const start24 = to24Hour(availability.start_time);
        const end24 = to24Hour(availability.end_time);

        if (req24 < start24 || req24 >= end24) throw new Error(`Doctor is available from ${availability.start_time} to ${availability.end_time}. Please select a time within this window.`);

        // Check if booked
        const booked = await Appointments.findOne({ where: { doctor_id, appointment_date: { [Op.like]: `${normalizedDate}%` }, appointment_time } });
        if (booked) throw new Error('Slot already booked');

        return res.response({
            success: true,
            message: 'Doctor is available for this slot'
        }).code(200);

    } catch (err) {
        console.error(err);
        return res.response({
            success: false,
            message: err.message || 'Something went wrong'
        }).code(200);
    }
};

const adminGetDoctorAvailableSlots = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user || session_user.role !== 'ADMIN') throw new Error('Unauthorized access');

        const { doctor_id, appointment_date } = req.payload;
        if (!doctor_id || !appointment_date)
            throw new Error('doctor_id and appointment_date are required');

        const doctor = await Doctors.findByPk(doctor_id);
        if (!doctor) throw new Error('Invalid doctor');

        const dateObj = parseAnyDate(appointment_date);
        const normalizedDate = normalizeDate(appointment_date);
        const todayNormalized = normalizeDate(new Date().toISOString());
        if (normalizedDate < todayNormalized) throw new Error('Past date not allowed');

        const day = dateObj.toLocaleDateString('en-IN', { weekday: 'long' });

        const availability = await Doctorsavailability.findOne({ where: { doctor_id, day } });
        if (!availability) throw new Error('Doctor is not available on this day');

        // Convert time to date object
        const toDate = (timeStr) => {
            const [time, mod] = timeStr.split(' ');
            let [h, m] = time.split(':').map(Number);
            if (mod === 'PM' && h !== 12) h += 12;
            if (mod === 'AM' && h === 12) h = 0;
            const d = new Date(dateObj);
            d.setHours(h, m, 0, 0);
            return d;
        };

        const start = toDate(availability.start_time);
        const end = toDate(availability.end_time);

        // Booked slots
        const booked = await Appointments.findAll({
            where: { doctor_id, appointment_date: { [Op.like]: `${normalizeDate(appointment_date)}%` } },
            raw: true
        });
        const bookedTimes = new Set(booked.map(b => b.appointment_time));

        // Generate slots
        const slots = [];
        let current = new Date(start);
        while (current < end) {
            const next = new Date(current.getTime() + 30 * 60000);
            const startStr = current.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            const endStr = next.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            const formattedStart = startStr.replace(' ', ' '); // remove weird spacing

            slots.push({
                start: formattedStart,
                end: endStr.replace(' ', ' '),
                is_available: !bookedTimes.has(formattedStart)
            });

            current = next;
        }

        return res.response({
            success: true,
            date: appointment_date,
            day,
            start_time: availability.start_time,
            end_time: availability.end_time,
            slots
        }).code(200);

    } catch (err) {
        console.error(err);
        return res.response({
            success: false,
            message: err.message || 'Something went wrong'
        }).code(200);
    }
};

const adminGetTodaysAppointments = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user || session_user.role !== 'ADMIN') throw new Error('Unauthorized access');

        const { doctor_id } = req.params;
        if (!doctor_id) throw new Error('doctor_id is required');

        const doctor = await Doctors.findByPk(doctor_id);
        if (!doctor) throw new Error('Invalid doctor');

        const today = new Date();
        const formattedToday = normalizeDate(today.toISOString());

        const appointments = await Appointments.findAll({
            where: { doctor_id, appointment_date: { [Op.like]: `${formattedToday}%` } },
            include: [
                {
                    model: Users,
                    attributes: { exclude: ['access_token', 'refresh_token', 'otp_id'] },
                    include: [{ model: Files }]
                }
            ]
        });

        return res.response({
            success: true,
            message: 'Today’s appointments fetched successfully',
            data: appointments
        }).code(200);

    } catch (err) {
        console.error(err);
        return res.response({
            success: false,
            message: err.message || 'Something went wrong'
        }).code(200);
    }
};

// doctor create appointment and generate payment link in razorpay
const adminCreateAppointmentWithPaymentLink = async (req, res) => {
    try {
        const session_user = req.headers.user;

        // 1️⃣ Admin authentication
        if (!session_user || session_user.role !== 'ADMIN')
            throw new Error('Unauthorized access');

        const {
            doctor_id,
            patient_id,
            appointment_date,
            appointment_time,
            reason,
            consultation_modes
        } = req.payload;

        // 2️⃣ Validate doctor & patient
        const doctor = await Doctors.findOne({
            where: { id: Number(doctor_id) }
        });
        const patient = await Users.findOne({
            where: { id: Number(patient_id) }
        });
        if (!doctor || !patient) throw new Error('Invalid doctor or patient');

        // 3️⃣ Check if appointment date is valid (future date)
        const appointmentDateObj = parseAnyDate(appointment_date);
        const normalizedDate = normalizeDate(appointment_date);
        const todayNormalized = normalizeDate(new Date().toISOString());
        if (normalizedDate < todayNormalized) throw new Error('Cannot book appointment in the past');

        // 4️⃣ Check if slot is already booked
        const existing = await Appointments.findOne({
            where: { doctor_id, appointment_date: { [Op.like]: `${normalizedDate}%` }, appointment_time }
        });
        if (existing) throw new Error('Slot already booked for this time');

        // 5️⃣ Check doctor availability for that day
        const appointmentDay = appointmentDateObj.toLocaleDateString('en-IN', { weekday: 'long' });
        console.log(appointmentDay);
        const availability = await Doctorsavailability.findOne({
            where: { doctor_id, day: appointmentDay }
        });
        console.log(availability);
        if (!availability) throw new Error('Doctor is not available on this day');

        // 6️⃣ Check if requested time is within doctor's available time
        const req24 = to24Hour(appointment_time);
        const start24 = to24Hour(availability.start_time);
        const end24 = to24Hour(availability.end_time);

        if (req24 < start24 || req24 >= end24) throw new Error(`Doctor is available from ${availability.start_time} to ${availability.end_time}. Please select a time within this window.`);

        // 7️⃣ Always use doctor's consultation_fee from DB (never from frontend - it may be in paise)
        const amount = doctor.consultation_fee || 500;
        const appointment = await Appointments.create({
            doctor_id,
            patient_id,
            appointment_date: normalizeDate(appointment_date),
            appointment_time,
            reason,
            status: 'pending',          // pending until payment
            payment_id: null,
            order_id: null,
            payment_signature: null,
            payment_status: 'pending',
            consultation_fee: amount,
            consultation_modes
        });
        console.log('Appointment created with ID:', {
            amount: amount * 100, // in paise
            currency: 'INR',
            accept_partial: false,
            description: `Consultation with Dr. ${doctor.name} on ${appointment_date} at ${appointment_time}`,
            customer: {
                name: patient.name,
                email: patient.email,
                contact: patient.phone
            },
            notify: { sms: true, email: true },
            reminder_enable: true,
            callback_url: `${process.env.SERVICE_URL}/appointment/${appointment.id}/callback`,
            callback_method: 'get'
        });
        const paymentLink = await razorpay.paymentLink.create({
            amount: amount * 100, // in paise
            currency: 'INR',
            accept_partial: false,
            description: `Consultation with Dr. ${doctor.name} on ${appointment_date} at ${appointment_time}`,
            customer: {
                name: patient.name,
                email: patient.email,
                contact: patient.phone
            },
            notify: { sms: true, email: true },
            reminder_enable: true,
            callback_url: `${process.env.SERVICE_URL}/appointment/${appointment.id}/callback`,
            callback_method: 'get'
        });
        appointment.order_id = paymentLink.id;
        await appointment.save();

        // Notify patient
        NotificationHelper.sendToUser(appointment.patient_id,
            'Appointment Booked',
            `Your appointment with Dr. ${doctor.name} on ${appointment_date} at ${appointment_time} has been booked. Payment link sent.`,
            { appointment_id: appointment.id }
        );

        // Notify doctor
        NotificationHelper.sendToDoctor(doctor_id,
            'New Appointment',
            `New appointment booked by ${patient.name} on ${appointment_date} at ${appointment_time}.`,
            { appointment_id: appointment.id }
        );

        GoogleCalendarHelper.createCalendarEvent(appointment, doctor, patient).catch(e =>
            console.error('Google Calendar event creation failed (non-blocking):', e.message)
        );

        // 9️⃣ Return appointment + payment link
        return res.response({
            success: true,
            message: 'Appointment created successfully. Share the payment link with the user.',
            data: {
                appointment,
                payment_link: paymentLink.short_url
            }
        }).code(200);

    } catch (err) {
        console.error(err);
        return res.response({
            success: false,
            message: err.message || 'Something went wrong'
        }).code(200);
    }
};

const callbackPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            razorpay_payment_id,
            razorpay_payment_link_id,
            razorpay_signature
        } = req.query;

        const appointment = await Appointments.findOne({
            where: { id }
        });
        if (!appointment) throw new Error('Appointment not found');

        await appointment.update({
            payment_id: razorpay_payment_id,
            order_id: razorpay_payment_link_id,
            payment_signature: razorpay_signature,
            payment_status: 'paid',
            status: 'pending'
        }, {
            where: { id }
        });

        // Notify patient
        NotificationHelper.sendToUser(appointment.patient_id,
            'Payment Confirmed',
            `Your payment for appointment #${appointment.id} has been confirmed.`,
            { appointment_id: appointment.id, payment_id: razorpay_payment_id }
        );

        const patient = await Users.findByPk(appointment.patient_id);
        const doctor = await Doctors.findOne({ where: { id: appointment.doctor_id }, raw: true });
        if (doctor && patient) {
            GoogleCalendarHelper.createCalendarEvent(appointment, doctor, patient).catch(e =>
                console.error('Google Calendar event creation failed (non-blocking):', e.message)
            );
        }

        return res.response({
            success: true,
            message: 'Payment successful and appointment updated',
            data: appointment
        }).code(200);

    } catch (err) {
        console.error(err);
        return res.response({
            success: false,
            message: err.message || 'Something went wrong'
        }).code(200);
    }
}

module.exports = {
    precheckAndCreateOrder,
    confirmAppointment,
    cancelAppointmentByUser,
    getadminAppointments,
    getDoctorAppointments,
    doctoreject,
    DoctorApproval,
    getRtcToken,
    getUserAppointments,
    checkDoctorAvailability,
    getDoctorAvailableTimeSlots,
    getTodaysAppointmentsDoctor,
    UpdateAppointmentStatus,
    adminGetTodaysAppointments,
    adminCheckDoctorSlot,
    adminCreateAppointmentWithPaymentLink,
    adminGetDoctorAvailableSlots,
    callbackPayment

}


// ek Api  ampount  with order id and send to frontend
// when we boojk payment will hit book appoibntnewewnt apio and payumnent id save