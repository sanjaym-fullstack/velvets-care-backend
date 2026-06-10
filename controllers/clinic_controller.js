
const fs = require('fs')
const {
    Op
} = require('sequelize')
const {
    FileFunctions, JWTFunctions
} = require('../helpers')

const {
    Clinics,
    Clinicdoctors,
    Otps,
    Files
} = require('../models')

const createClinic = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) {
            throw new Error('Session expired');
        }
        const {
            name,
            address,
           street,
            floor_number,
            area,
            city,
            state,
            country,
            pincode,
            landmark,
            phone,
            email,
            profile_image,
            description
        } = req.payload

        const uploadedImage = await FileFunctions.uploadToS3(profile_image.filename, 'uploads/clinic_images', fs.readFileSync(profile_image.path))
        const uploaded_files = await Files.create({
            files_url: uploadedImage.key,
            extension: uploadedImage.key.split('.').pop(),
            original_name: uploadedImage.key,
            size: fs.statSync(profile_image.path).size
        })

        const clinic = await Clinics.create({
            name,
            address,
            street,
            floor_number,
            area,
            city,
            state,
            country,
            pincode,
            landmark,
            phone,
            email,
            profile_image_id: uploaded_files.id,
            description
        })

        return res.response({
            success: true,
            message: 'Clinic created successfully',
            data: clinic
        }).code(200);

    } catch (error) {
        console.log(error);
        return res.response({
            success: false,
            message: error.message,
        }).code(200);
    }
}

module.exports = {
    createClinic
}