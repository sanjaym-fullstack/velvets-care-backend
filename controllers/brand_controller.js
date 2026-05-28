const { Op } = require('sequelize');
const { Brands, Files } = require('../models');
const {
  FileFunctions, JWTFunctions,
} = require('../helpers')
const fs = require('fs')
// Create Brand
const CreateBrand = async (req, res) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) throw new Error('Session expired');

    const { name, slug, is_active, brand_image, description } = req.payload;

    const existing = await Brands.findOne({ where: { name } });
    if (existing) throw new Error('Brand already exists');


    let uploaded_files = null;
    if (brand_image) {
      const uploadedImage = await FileFunctions.uploadToS3(brand_image.filename, 'uploads/brands', fs.readFileSync(brand_image.path));
      uploaded_files = await Files.create({
        files_url: uploadedImage.key,
        extension: uploadedImage.key.split('.').pop(),
        original_name: uploadedImage.key,
        size: fs.statSync(brand_image.path).size
      });
    }
    const brand = await Brands.create({
      name,
      slug,
      brand_image: uploaded_files ? uploaded_files.id : null,
      description,
      is_active: is_active ?? true,
    });

    return res.response({
      success: true,
      message: 'Brand created successfully',
      data: brand,
    }).code(201);
  } catch (error) {
    console.error('Error creating brand:', error);
    return res.response({ success: false, message: error.message });
  }
};

// Update Brand
const UpdateBrand = async (req, res) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) throw new Error('Session expired');

    const brandId = req.params.id;
    const { name, slug, is_active, brand_image, description } = req.payload;

    const brand = await Brands.findByPk(brandId);
    if (!brand) throw new Error('Brand not found');
    let uploaded_files = null;
    if (brand_image) {

      const uploadedImage = await FileFunctions.uploadToS3(brand_image.filename, 'uploads/brands', fs.readFileSync(brand_image.path));
      uploaded_files = await Files.create({
        files_url: uploadedImage.key,
        extension: uploadedImage.key.split('.').pop(),
        original_name: uploadedImage.key,
        size: fs.statSync(brand_image.path).size
      })
    }

    await brand.update({ name, slug, is_active, brand_image: uploaded_files ? uploaded_files.id : null, description },
      {
        where: { id: brandId },
      }
    );

    return res.response({
      success: true,
      message: 'Brand updated successfully',
      data: brand,
    });
  } catch (error) {
    console.error('Error updating brand:', error);
    return res.response({ success: false, message: error.message });
  }
};

// Delete Brand
const DeleteBrand = async (req, res) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) throw new Error('Session expired');

    const brandId = req.params.id;
    const brand = await Brands.findByPk(brandId);
    if (!brand) throw new Error('Brand not found');

    await brand.destroy();

    return res.response({
      success: true,
      message: 'Brand deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting brand:', error);
    return res.response({ success: false, message: error.message });
  }
};

// Admin Fetch Brands
const AdminBrands = async (req, res) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) throw new Error('Session expired');

    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };

    const brands = await Brands.findAll({
      include: [
        {
          model: Files,
        },
      ],
      where, limit, offset
    });

    const totalCount = await Brands.count({ where });

    const brand_mapped = brands.map(async (brand) => {
      return {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        brand_image: brand.Files?.[0]?.files_url ? await FileFunctions.getFromS3(brand.Files[0].files_url) : null,
        description: brand.description,
        is_active: brand.is_active,
      };
    });

    return res.response({
      success: true,
      message: 'Brands fetched successfully',
      data: await Promise.all(brand_mapped),
      meta: {
        totalCount,
        page,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return res.response({ success: false, message: error.message });
  }
};

// User Fetch Brands
const UserBrands = async (req, res) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) throw new Error('Session expired');

    const brands = await Brands.findAll({
      where: { is_active: true },
      include: [
        {
          model: Files,
        },
      ],
    });
    const brand_mapped = brands.map(async (brand) => {
      return {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        brand_image: brand.Files?.[0]?.files_url ? await FileFunctions.getFromS3(brand.Files[0].files_url) : null,
        description: brand.description,
        is_active: brand.is_active,
      };
    });
    return res.response({
      success: true,
      data: await Promise.all(brand_mapped),
    });
  } catch (error) {
    console.error('Error fetching user brands:', error);
    return res.response({ success: false, message: error.message });
  }
};

// Get Single Brand
const GetBrandById = async (req, res) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) throw new Error('Session expired');

    const brandId = req.params.id;

    const brand = await Brands.findByPk(brandId, {
      include: [{ model: Files }],
    });
    if (!brand) throw new Error("Brand not found");

    const data = {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      brand_image: brand.Files?.[0]?.files_url ? await FileFunctions.getFromS3(brand.Files[0].files_url) : null,
      description: brand.description,
      is_active: brand.is_active,
    };

    return res.response({ success: true, data });
  } catch (error) {
    console.error("Error fetching brand:", error);
    return res.response({ success: false, message: error.message });
  }
};

module.exports = {
  CreateBrand,
  UpdateBrand,
  DeleteBrand,
  AdminBrands,
  UserBrands,
  GetBrandById,
};
