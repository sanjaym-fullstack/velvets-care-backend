const fs = require('fs');
const { Op } = require('sequelize');
const { Subcategories, Categories, Files } = require('../models');
const {
  FileFunctions, JWTFunctions,
} = require('../helpers')
// Create Subcategory
const CreateSubCategory = async (req, res) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) throw new Error('Session expired');

    const { name, slug, is_active, category_id, subcategory_image, description } = req.payload;

    const existing = await Subcategories.findOne({ where: { name, category_id } });
    if (existing) throw new Error('Subcategory already exists in this category');
    let uploaded_files = null;
    if (subcategory_image) {
      const uploadedImage = await FileFunctions.uploadToS3(subcategory_image.filename, 'uploads/subcategories', fs.readFileSync(subcategory_image.path));
      uploaded_files = await Files.create({
        files_url: uploadedImage.key,
        extension: uploadedImage.key.split('.').pop(),
        original_name: uploadedImage.key,
        size: fs.statSync(subcategory_image.path).size
      });
    }
    const subcategory = await Subcategories.create({
      name,
      slug,
      category_id,
      description: description || null,
      is_active: is_active ?? true,
      subcategory_image: uploaded_files ? uploaded_files.id : null
    });

    return res.response({
      success: true,
      message: 'Subcategory created successfully',
      data: subcategory,
    }).code(201);
  } catch (error) {
    console.error('Error creating subcategory:', error);
    return res.response({ success: false, message: error.message });
  }
};

// Update Subcategory
const UpdateSubCategory = async (req, res) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) throw new Error('Session expired');

    const subId = req.params.id;
    const { name, slug, is_active, category_id, subcategory_image, description } = req.payload;

    const subcategory = await Subcategories.findByPk(subId);
    if (!subcategory) throw new Error('Subcategory not found');
    let uploaded_files = null;
    if (subcategory_image) {
      const uploadedImage = await FileFunctions.uploadToS3(subcategory_image.filename, 'uploads/subcategories', fs.readFileSync(subcategory_image.path));
      uploaded_files = await Files.create({
        files_url: uploadedImage.key,
        extension: uploadedImage.key.split('.').pop(),
        original_name: uploadedImage.key,
        size: fs.statSync(subcategory_image.path).size
      });
    }
    await subcategory.update({ name, slug, is_active, category_id, description: description || null, subcategory_image: uploaded_files ? uploaded_files.id : null },
      { where: { id: subId } }
    );

    return res.response({
      success: true,
      message: 'Subcategory updated successfully',
      data: subcategory,
    });
  } catch (error) {
    console.error('Error updating subcategory:', error);
    return res.response({ success: false, message: error.message });
  }
};

// Delete Subcategory
const DeleteSubCategory = async (req, res) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) throw new Error('Session expired');

    const subId = req.params.id;
    const subcategory = await Subcategories.findByPk(subId);
    if (!subcategory) throw new Error('Subcategory not found');

    await subcategory.destroy();

    return res.response({
      success: true,
      message: 'Subcategory deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    return res.response({ success: false, message: error.message });
  }
};

// Admin Fetch Subcategories
const AdminSubCategories = async (req, res) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) throw new Error('Session expired');

    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };

    const count = await Subcategories.count({ where });

    const subcategories = await Subcategories.findAll({
      where,
      include: [{ model: Categories },
      {
        model: Files,
      },
      ],
      mapToModel: true,
      nest: true,
      raw: true,  
      limit,
      offset,
    });

    const subcategory_mapped = subcategories.map(async (subcategory) => {
      return {
        id: subcategory.id,
        name: subcategory.name,
        slug: subcategory.slug,
        category_id: subcategory.category_id,
        category: subcategory.category,
        subcategory_image: subcategory.file?.files_url ? await FileFunctions.getFromS3(subcategory.file.files_url) : null,
        description: subcategory.description,
        is_active: subcategory.is_active,
      };
    });

    return res.response({
      success: true,
      message: 'Subcategories fetched successfully',
      data: {
        data: await Promise.all(subcategory_mapped),
        total: count,
        page,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return res.response({ success: false, message: error.message });
  }
};

// User Fetch Subcategories
const UserSubCategories = async (req, res) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) throw new Error('Session expired');

    const subcategories = await Subcategories.findAll({
      where: { is_active: true }
      , include: [{ model: Categories }, { model: Files }],
      mapToModel: true,
      nest: true,
      raw: true,
    });


    const subcategory_mapped = subcategories.map(async (subcategory) => {
      return {
        id: subcategory.id,
        name: subcategory.name,
        slug: subcategory.slug,
        category_id: subcategory.category_id,
        category: subcategory.category,
        subcategory_image: subcategory.file?.files_url ? await FileFunctions.getFromS3(subcategory.file.files_url) : null,
        description: subcategory.description,
        is_active: subcategory.is_active,
      };
    });

    return res.response({
      success: true,
      data: await Promise.all(subcategory_mapped),
    });
  } catch (error) {
    console.error('Error fetching user subcategories:', error);
    return res.response({ success: false, message: error.message });
  }
};

// Get Single Subcategory
const GetSubCategoryById = async (req, res) => {
  try {
    const session_user = req.headers.user;
    if (!session_user) throw new Error('Session expired');

    const subId = req.params.id;

    const subcategory = await Subcategories.findByPk(subId, { include: [{ model: Categories }, { model: Files }] });
    if (!subcategory) throw new Error('Subcategory not found');

    const data = {
      id: subcategory.id,
      name: subcategory.name,
      slug: subcategory.slug,
      category_id: subcategory.category_id,
      category: subcategory.category,
      subcategory_image: subcategory.file?.files_url ? await FileFunctions.getFromS3(subcategory.file.files_url) : null,
      description: subcategory.description,
      is_active: subcategory.is_active,
    };

    return res.response({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching subcategory:', error);
    return res.response({ success: false, message: error.message });
  }
};

module.exports = {
  CreateSubCategory,
  UpdateSubCategory,
  DeleteSubCategory,
  AdminSubCategories,
  UserSubCategories,
  GetSubCategoryById,
};
