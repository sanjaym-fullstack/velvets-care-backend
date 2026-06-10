const { Op, fn, col, literal } = require('sequelize');
const {
    Prescriptions,
    Users,
    Doctors,
    Files
} = require('../models');

const { FileFunctions } = require('../helpers');
const fs = require('fs');

/* ----------------- HELPERS ----------------- */

const generatePrescriptionId = (id) => {
    const year = new Date().getFullYear();
    return `velvetscare#${year}${String(id).padStart(5, '0')}`;
};

/* ----------------- CREATE (Doctor / User / Admin) ----------------- */

const uploadPrescription = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const {
            doctor_id,
            user_id,
            prescription_name,
            uploaded_by
        } = req.payload;

        const file = req.payload.file;
        if (!file) throw new Error('Prescription file required');

        const uploadedFile = await FileFunctions.uploadToS3(
            file.filename,
            'uploads/prescriptions',
            fs.readFileSync(file.path)
        );

        const fileRecord = await Files.create({
            files_url: uploadedFile.key,
            extension: uploadedFile.key.split('.').pop(),
            original_name: file.filename,
            size: fs.statSync(file.path).size
        });

        const prescription = await Prescriptions.create({
            doctor_id: doctor_id || null,
            user_id: user_id || null,
            file_id: fileRecord.id,
            prescription_name,
            uploaded_by
        });

        await prescription.update({
            prescription_id: generatePrescriptionId(prescription.id)
        });

        return res.response({
            success: true,
            message: 'Prescription uploaded successfully',
            data: prescription
        }).code(201);

    } catch (error) {
        console.error('Upload Prescription Error:', error);
        return res.response({
            success: false,
            message: error.message
        }).code(500);
    }
};

/* ----------------- USER FETCH (Own + Doctor Given) ----------------- */

const getUserPrescriptions = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const user_id = session_user.user_id;
        const { page = 1, limit = 10, search } = req.query;
        const offset = (page - 1) * limit;

        let where = { user_id };

        if (search) {
            where[Op.or] = [
                { prescription_id: { [Op.like]: `%${search}%` } },
                { prescription_name: { [Op.like]: `%${search}%` } }
            ];
        }

        const { rows, count } = await Prescriptions.findAndCountAll({
            where,
            include: [{ model: Files }],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        const mapped = await Promise.all(rows.map(async (row) => {
            const json = row.toJSON();
            if (json.File) {
                json.file_url = json.File.files_url
                    ? await FileFunctions.getFromS3(json.File.files_url)
                    : null;
            }
            return json;
        }));

        return res.response({
            success: true,
            total: count,
            page,
            data: mapped
        }).code(200);

    } catch (error) {
        return res.response({
            success: false,
            message: error.message
        }).code(500);
    }
};

/* ----------------- DOCTOR LIST + STATS ----------------- */

const getDoctorPrescriptions = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const doctor_id = session_user.doctor_id;
        const { page = 1, limit = 10, user_id } = req.query;
        const offset = (page - 1) * limit;

        let where = { doctor_id };
        if (user_id) where.user_id = user_id;

        const prescriptions = await Prescriptions.findAndCountAll({
            where,
            include: [
                { model: Users, attributes: ['id', 'name', 'email', 'phone'] },
                { model: Files }
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        const mapped = await Promise.all(prescriptions.rows.map(async (row) => {
            const json = row.toJSON();
            if (json.File) {
                json.file_url = json.File.files_url
                    ? await FileFunctions.getFromS3(json.File.files_url)
                    : null;
            }
            return json;
        }));

        // Stats
        const todayCount = await Prescriptions.count({
            where: {
                doctor_id,
                createdAt: {
                    [Op.gte]: literal('CURDATE()')
                }
            }
        });

        const yearCount = await Prescriptions.count({
            where: {
                doctor_id,
                createdAt: {
                    [Op.gte]: literal('DATE_SUB(CURDATE(), INTERVAL 1 YEAR)')
                }
            }
        });

        return res.response({
            success: true,
            stats: {
                today: todayCount,
                yearly: yearCount
            },
            total: prescriptions.count,
            data: mapped
        }).code(200);

    } catch (error) {
        return res.response({
            success: false,
            message: error.message
        }).code(500);
    }
};

/* ----------------- ADMIN LIST ----------------- */

const getAdminPrescriptions = async (req, res) => {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const offset = (page - 1) * limit;

        let where = {};
        if (search) {
            where[Op.or] = [
                { prescription_id: { [Op.like]: `%${search}%` } },
                { prescription_name: { [Op.like]: `%${search}%` } }
            ];
        }

        const prescriptions = await Prescriptions.findAndCountAll({
            where,
            include: [
                { model: Users },
                { model: Doctors },
                { model: Files }
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        const mapped = await Promise.all(prescriptions.rows.map(async (row) => {
            const json = row.toJSON();
            if (json.File) {
                json.file_url = json.File.files_url
                    ? await FileFunctions.getFromS3(json.File.files_url)
                    : null;
            }
            return json;
        }));

        return res.response({
            success: true,
            total: prescriptions.count,
            data: mapped
        }).code(200);

    } catch (error) {
        return res.response({
            success: false,
            message: error.message
        }).code(500);
    }
};

/* ----------------- SINGLE FETCH ----------------- */

const getPrescriptionById = async (req, res) => {
    try {
        const { id } = req.params;

        const prescription = await Prescriptions.findByPk(id, {
            include: [Users, Doctors, Files]
        });

        if (!prescription) throw new Error('Prescription not found');

        const json = prescription.toJSON();
        if (json.File) {
            json.file_url = json.File.files_url
                ? await FileFunctions.getFromS3(json.File.files_url)
                : null;
        }

        return res.response({
            success: true,
            data: json
        }).code(200);

    } catch (error) {
        return res.response({
            success: false,
            message: error.message
        }).code(404);
    }
};

/* ----------------- UPDATE ----------------- */

const updatePrescription = async (req, res) => {
    try {
        const { id, prescription_name, file } = req.payload;

        const prescription = await Prescriptions.findByPk(id);
        if (!prescription) throw new Error('Prescription not found');

        const updates = {};
        if (prescription_name) updates.prescription_name = prescription_name;

        if (file) {
            const uploadedFile = await FileFunctions.uploadToS3(
                file.filename,
                'uploads/prescriptions',
                fs.readFileSync(file.path)
            );

            const fileRecord = await Files.create({
                files_url: uploadedFile.key,
                extension: uploadedFile.key.split('.').pop(),
                original_name: file.filename,
                size: fs.statSync(file.path).size
            });

            updates.file_id = fileRecord.id;
        }

        await prescription.update(updates);

        const updated = await Prescriptions.findByPk(id, {
            include: [Files]
        });

        const json = updated.toJSON();
        if (json.File) {
            json.file_url = json.File.files_url
                ? await FileFunctions.getFromS3(json.File.files_url)
                : null;
        }

        return res.response({
            success: true,
            message: 'Prescription updated',
            data: json
        }).code(200);

    } catch (error) {
        return res.response({
            success: false,
            message: error.message
        }).code(500);
    }
};

/* ----------------- DELETE ----------------- */

const deletePrescription = async (req, res) => {
    try {
        const { id } = req.payload;

        const prescription = await Prescriptions.findByPk(id);
        if (!prescription) throw new Error('Prescription not found');

        await prescription.destroy();

        return res.response({
            success: true,
            message: 'Prescription deleted'
        }).code(200);

    } catch (error) {
        return res.response({
            success: false,
            message: error.message
        }).code(500);
    }
};

/* ----------------- EXPORTS ----------------- */

module.exports = {
    uploadPrescription,
    getUserPrescriptions,
    getDoctorPrescriptions,
    getAdminPrescriptions,
    getPrescriptionById,
    updatePrescription,
    deletePrescription
};
