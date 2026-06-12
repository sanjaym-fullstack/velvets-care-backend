const {
    Admins,
    Otps,
    Files,
    Users,
    Doctors
} = require('../models')
const {
    Op
} = require('sequelize')
const {
    OTPFunctions, MailFunctions, JWTFunctions, NotificationHelper
} = require('../helpers')


const send_otp_admin = async (req, res) => {
    try {
        const { email } = req.payload;
        const admin = await Admins.findOne({ where: { email: email } });
        if (!admin) {
            throw new Error('Admin not found');
        }
        const otp = '123456' // await OTPFunctions.getOTPByLength(6);
        console.log("login otp:", otp);
        const otpCode = await Otps.create({
            otp: otp,
            otp_time: Date.now()
        })
        const receiver_mail = email;
        const receiver_name = 'Admin';
        const sender_mail = process.env.MAIL_USER;
        const sender_name = 'Velvets Care';
        const subject = 'OTP for admin Login';
        const html = `
                    <p>Dear User,</p>

                    <p>Your One Time Password (OTP) for login is:</p>

                    <h2 style="color: #2e6c80;">${otp}</h2>

                    <p>Please enter this OTP to complete your login. This code is valid for 5 minutes.</p>

                    <p>If you did not request this OTP, please ignore this email.</p>

                    <br/>
                    <p>Thank you,<br/>
                    <b>Velvets Care Team</b></p>
                    `;

        await MailFunctions.sendHtmlMailToSingleReceiver(receiver_mail, receiver_name, sender_mail, sender_name, subject, html);

        await Admins.update({
            otp_id: otpCode.id
        }, {
            where: {
                email: email
            }
        })
        return res.response({
            success: true,
            message: 'OTP sent successfully',
        })

    } catch (error) {
        console.log(error);
        return res.response({
            success: false,
            message: error.message,
        }).code(200);

    }
}

const verify_otp_admin = async (req, res) => {
    try {
        const { email, otp } = req.payload;
        const admin = await Admins.findOne({ where: { email: email } });
        if (!admin) {
            return res.response({
                success: false,
                message: 'Admin not found',
            })
        }
        const otpCode = await Otps.findOne({
            where: {
                id: admin.otp_id
            },
            raw: true
        })
        const otpTime = new Date(otpCode.otp_time);
        const currentTime = new Date();
        // Check if OTP is older than 10 minutes        
        const diffInMinutes = (currentTime - otpTime) / 1000 / 60;
        if (diffInMinutes > 10) {
            return res.response({
                success: false,
                message: 'OTP expired',
            })
        }
        if (otpCode.otp !== otp) {
            return res.response({
                success: false,
                message: 'Invalid OTP',
            })
        }
        const access_token = await JWTFunctions.generateToken({ email: email, id: admin.id, role: 'ADMIN' }, '1h');
        const refresh_token = await JWTFunctions.generateToken({ email: email, id: admin.id, role: 'ADMIN' }, '1d');
        await Admins.update({
            access_token: access_token,
            refresh_token: refresh_token,
        }, {
            where: {
                email: email
            }
        })
        return res.response({
            success: true,
            message: 'OTP verified successfully',
            data: {
                access_token: access_token,
                refresh_token: refresh_token,
                admin: {
                    id: admin.id,
                    name: admin.name,
                    email: admin.email
                }
            }
        })
    } catch (error) {
        console.log(error);
        return res.response({
            success: false,
            message: error.message,
        }).code(200);

    }
}

const validateSession = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) {
            throw new Error('Session expired');
        }
        const admin = await Admins.findOne({
            where: {
                id: session_user.id
            },
            attributes: [
                'id',
                'name',
                'email',
            ]
        });
        return res.response({
            success: true,
            message: 'Admins session verified successfully',
            data: admin,
        });
    } catch (error) {
        console.log(error);
        return res.response({
            success: false,
            message: error.message,
        }).code(200);
    }
}
const fetchAdmins = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) {
            throw new Error('Session expired');
        }
        const admins = await Admins.findAll({
            attributes: ['id', 'name', 'email'],
        });
        return res.response({
            success: true,
            message: 'Admins fetched successfully',
            data: admins,
        });
    } catch (error) {
        console.log(error);
        return res.response({
            success: false,
            message: error.message,
        }).code(200);
    }
}

const createAdmin = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) {
            throw new Error('Session expired');
        }
        const { name, email } = req.payload;
        const admin_existing = await Admins.findOne({ where: { email: email } });
        if (admin_existing) {
            throw new Error('Admin already exists');
        }
        const admin = await Admins.create({
            name: name,
            email: email
        });
        return res.response({
            success: true,
            message: 'Admin created successfully',
            data: admin,
        });
    } catch (error) {
        console.log(error);
        return res.response({
            success: false,
            message: error.message,
        }).code(200);
    }
}
const sendNotification = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user || !session_user.is_admin) throw new Error('Unauthorized');

        const { user_ids, doctor_ids, title, body, send_to_all } = req.payload;

        if (send_to_all) {
            await NotificationHelper.sendToAllUsers(title, body);
            await NotificationHelper.sendToAllDoctors(title, body);
        } else {
            if (user_ids?.length) {
                await Promise.allSettled(user_ids.map(id =>
                    NotificationHelper.sendToUser(id, title, body)
                ));
            }
            if (doctor_ids?.length) {
                await Promise.allSettled(doctor_ids.map(id =>
                    NotificationHelper.sendToDoctor(id, title, body)
                ));
            }
        }

        return res.response({ success: true, message: 'Notification sent successfully' }).code(200);
    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message }).code(500);
    }
};

module.exports = {
    send_otp_admin,
    verify_otp_admin,
    fetchAdmins,
    createAdmin,
    validateSession,
    sendNotification
}
