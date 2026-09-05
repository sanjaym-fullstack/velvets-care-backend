const { Op } = require('sequelize');
const { FileFunctions } = require('../helpers');
const { Specialization, Files, Doctors } = require('../models');
const fs = require('fs');

// ======================================================
// CREATE SPECIALIZATION
// ======================================================
const createSpecialization = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { name, icon } = req.payload;
        if (!name) throw new Error('Specialization name is required');

        let iconStore = null;

        // Upload icon if provided
        if (icon) {
            const upload = await FileFunctions.uploadToS3(
                icon.filename,
                'uploads/specialization',
                fs.readFileSync(icon.path)
            );

            iconStore = await Files.create({
                files_url: upload.key,
                extension: upload.key.split('.').pop(),
                original_name: upload.key,
                size: fs.statSync(icon.path).size
            });
        }

        const specialization = await Specialization.create({
            name,
            icon_id: iconStore?.id || null
        });

        return res.response({
            success: true,
            message: 'Specialization created successfully',
            data: specialization
        });
    } catch (error) {
        console.error('Error creating specialization:', error);
        return res.response({
            success: false,
            message: error.message || 'Something went wrong'
        });
    }
};

// ======================================================
// ADMIN — GET ALL SPECIALIZATIONS
// ======================================================
const getAllSpecializationsAdmin = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { page = 1, limit = 10, search } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const offset = (pageNum - 1) * limitNum;

        let filter = {};
        if (search) {
            filter.name = { [Op.like]: `%${search}%` };
        }

        const specializations = await Specialization.findAll({
            include: [
                { model: Files },
                { model: Doctors }
            ],
            where: filter,
            limit: limitNum,
            offset: offset,
            raw: true,
            nest: true
        });

        const total = await Specialization.count({ where: filter });

        const mapped = await Promise.all(
            specializations.map(async (item) => ({
                id: item.id,
                name: item.name,
                icon_id: item.icon_id,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                image: item.file?.files_url
                    ? await FileFunctions.getFromS3(item.file.files_url)
                    : null,
                doctorCount: item.doctors?.id ? 1 : 0
            }))
        );

        return res.response({
            success: true,
            message: 'Specializations fetched successfully',
            data: {
                specialization: mapped,
                total
            }
        });
    } catch (error) {
        console.error('Error fetching specializations:', error);
        return res.response({
            success: false,
            message: error.message || 'Something went wrong'
        });
    }
};

// ======================================================
// USERS — GET ALL SPECIALIZATIONS
// ======================================================
const getspecilaizationsUsers = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const specialization = await Specialization.findAll({
            include: [{ model: Files }]
        });

        const mapped = await Promise.all(
            specialization.map(async (item) => ({
                id: item.id,
                name: item.name,
                icon_id: item.icon_id,
                image: item.file?.files_url
                    ? await FileFunctions.getFromS3(item.file.files_url)
                    : null
            }))
        );

        return res.response({
            success: true,
            message: 'Specializations fetched successfully',
            data: mapped
        });
    } catch (error) {
        console.error('Error fetching specialization:', error);
        return res.response({
            success: false,
            message: error.message || 'Something went wrong'
        });
    }
};

// ======================================================
// GET DOCTORS BY SPECIALIZATION
// ======================================================
const getdoctorsbasedonspecialization = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { id } = req.query;
        if (!id) throw new Error('Specialization ID is required');

        const doctors_data = await Doctors.findAll({
            where: { specialization_id: id },
            include: [
                { model: Files, as: 'profile_image_file' }
            ]
        });
            const doctors = await Promise.all(
                doctors_data.map(async (doctor) => ({
                    id: doctor.id,
                    name: doctor.name,
                    specialization_id: doctor.specialization_id,
                    profile_image: doctor.profile_image_file?.files_url
                        ? await FileFunctions.getFromS3(doctor.profile_image_file.files_url)
                        : null
                }))
            );

        return res.response({
            success: true,
            message: 'Doctors fetched successfully',
            data: doctors
        });
    } catch (error) {
        console.error('Error fetching doctors:', error);
        return res.response({
            success: false,
            message: error.message || 'Something went wrong'
        });
    }
};

// ======================================================
// DELETE SPECIALIZATION
// ======================================================
const deleteSpecialization = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { id } = req.params;
        if (!id) throw new Error('Specialization ID is required');

        const specialization = await Specialization.findOne({ where: { id } });
        if (!specialization) throw new Error('Specialization not found');

        await specialization.destroy();

        return res.response({
            success: true,
            message: 'Specialization deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting specialization:', error);
        return res.response({
            success: false,
            message: error.message || 'Something went wrong'
        });
    }
};

// ======================================================
// UPDATE SPECIALIZATION
// ======================================================
const updateSpecialization = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { id, name, icon } = req.payload;
        if (!id || !name) throw new Error('Specialization ID and name are required');

        const specialization = await Specialization.findOne({ where: { id } });
        if (!specialization) throw new Error('Specialization not found');

        let icon_id = specialization.icon_id;

        if (icon) {
            const upload = await FileFunctions.uploadToS3(
                icon.filename,
                'uploads/specialization',
                fs.readFileSync(icon.path)
            );

            const fileRecord = await Files.create({
                files_url: upload.key,
                extension: upload.key.split('.').pop(),
                original_name: upload.key,
                size: fs.statSync(icon.path).size
            });

            icon_id = fileRecord.id;
        }

        await Specialization.update(
            { name, icon_id },
            { where: { id } }
        );

        return res.response({
            success: true,
            message: 'Specialization updated successfully'
        });
    } catch (error) {
        console.error('Error updating specialization:', error);
        return res.response({
            success: false,
            message: error.message || 'Something went wrong'
        });
    }
};

module.exports = {
    createSpecialization,
    getAllSpecializationsAdmin,
    getdoctorsbasedonspecialization,
    getspecilaizationsUsers,
    updateSpecialization,
    deleteSpecialization
};
