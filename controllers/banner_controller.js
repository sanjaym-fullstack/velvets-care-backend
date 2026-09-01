const {
    Files,
    Banners
} = require('../models')
const {
    Op
} = require('sequelize')
const {
    FileFunctions, JWTFunctions , 
} = require('../helpers')
const fs = require('fs')


const banner_upload = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) {
            throw new Error('Session expired');
        }
        const { image, title } = req.payload;

        if (!image) {
            throw new Error('Banner image required');
        }
        if (!title) {
            throw new Error('Banner title required');
        }
        const uploadedImage = await FileFunctions.uploadToS3(image.filename, 'uploads/banners', fs.readFileSync(image.path));
        const uploaded_files = await Files.create({
            files_url: uploadedImage.key,
            extension: uploadedImage.key.split('.').pop(),
            original_name: uploadedImage.key,
            size: fs.statSync(image.path).size
        })
       const banner = await Banners.create({
            banner_image_id: uploaded_files.id,
            title: title
        })
        const imageUrl = await FileFunctions.getFromS3(uploaded_files.files_url);
        return res.response({
            success: true,
            message: 'Banner uploaded successfully',
            data: {
                ...banner.toJSON(),
                image: imageUrl
            }
        }).code(200);
        
    } catch (error) {
        console.log(error);
        return res.response({
            success: false,
            message: error.message,
        }).code(200);
        
    }
}

const get_banner_users = async (req, res) => {
    try {
        const banner = await Banners.findAll({
            include: [
                {
                    model: Files,
                    required: true
                }
            ],
            raw: true,
            nest: true,
            mapToModel: true

        })
        console.log(banner, "banners");
        const banner_mapped = banner.map(async( banner_item) => {
            return {
                id: banner_item.id,
                title: banner_item.title,
                image: banner_item.file?.files_url ? await FileFunctions.getFromS3(banner_item.file.files_url) : null
            }
        })
        console.log(banner_mapped, "mapped banners");   
        return res.response({
            success: true,
            message: 'Banners fetched successfully',
            data: await Promise.all(banner_mapped)
        }).code(200);
        
    } catch (error) {
        console.log(error);
        return res.response({
            success: false,
            message: error.message,
        }).code(200);
        
    }
}
const banner_delete = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) {
            throw new Error('Session expired');
        }
        const { banner_id } = req.payload;
        const banner = await Banners.findOne({ where: { id: banner_id } });
        if (!banner) {
            throw new Error('Banner not found');
        }
        await banner.destroy({
            where: {
                id: banner_id
            }
        })
        return res.response({
            success: true,
            message: 'Banner deleted successfully',
        }).code(200);
        
    } catch (error) {
        console.log(error);
        return res.response({
            success: false,
            message: error.message,
        }).code(200);
        
    }
}
const get_banner_admin = async (req, res) => {
    try {
      const session_user = req.headers.user;
        if(!session_user){
            throw new Error('Session expired');
        }
        const { limit = 10, page = 1 } = req.query;

        const banners_count = await Banners.count();
        const banners = await Banners.findAll({
            include: [
                {
                    model: Files,
                    required: true
                }
            ],
            limit: limit,
            offset: (page - 1) * limit,
            raw: true,
            nest: true,
            mapToModel: true
        });
        const banner_mapped = banners.map(async( banner_item) => {
            return {
                id: banner_item.id,
                title: banner_item.title,
                image: banner_item.file?.files_url ? await FileFunctions.getFromS3(banner_item.file.files_url) : null
            }
        })
        return res.response({ 
            success: true,
            message: 'Banners fetched successfully',
            data: await Promise.all(banner_mapped),
            total: banners_count,
            page: page,
            limit: limit
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
    banner_upload,
    get_banner_users,
    banner_delete,
    get_banner_admin
}