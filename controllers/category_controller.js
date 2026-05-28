'use strict';

const fs = require('fs');
const { Op } = require('sequelize');
const { Categories, Files } = require('../models');
const {
    FileFunctions, JWTFunctions , 
} = require('../helpers')
// Create Category
const CreateCategory = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { name, description, is_active,slug,category_image } = req.payload;

        const existing = await Categories.findOne({ where: { name } });
        if (existing) throw new Error('Category already exists');
        let uploaded_files = null;
        if(category_image) {
           const uploadedImage = await FileFunctions.uploadToS3(category_image.filename, 'uploads/categories', fs.readFileSync(category_image.path));
               uploaded_files = await Files.create({
                files_url: uploadedImage.key,
                extension: uploadedImage.key.split('.').pop(),
                original_name: uploadedImage.key,
                size: fs.statSync(category_image.path).size
              });
            }
        const category = await Categories.create({
            name,
            description: description || null,
            is_active: is_active ?? true,
            slug,
            category_image: uploaded_files ? uploaded_files.id : null
        });

        return res.response({
            success: true,
            message: 'Category created successfully',
            data: category,
        }).code(201);
    } catch (error) {
        console.error('Error creating category:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Update Category
const UpdateCategory = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { id } = req.params;
        const { category_image, ...updates } = req.payload;

        const category = await Categories.findOne({ where: { id } });
        if (!category) throw new Error('Category not found');
        let uploaded_files = null;
        if (category_image) {
            const uploadedImage = await FileFunctions.uploadToS3(category_image.filename, 'uploads/categories', fs.readFileSync(category_image.path));
            uploaded_files = await Files.create({
                files_url: uploadedImage.key,
                extension: uploadedImage.key.split('.').pop(),
                original_name: uploadedImage.key,
                size: fs.statSync(category_image.path).size
              });
            }
        await category.update({ ...updates, category_image: uploaded_files ? uploaded_files.id : null },
            {
                where: { id },
            },
            
        );

        return res.response({
            success: true,
            message: 'Category updated successfully',
            data: category,
        });
    
    } catch (error) {
        console.error('Error updating category:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Delete Category
const DeleteCategory = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { id } = req.params;
        const category = await Categories.findOne({ where: { id } });
        if (!category) throw new Error('Category not found');

        await category.destroy();

        return res.response({
            success: true,
            message: 'Category deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Get Category by ID
const GetCategoryById = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { id } = req.params;
        const category = await Categories.findOne({
            where: { id },
            include: [{ model: Files }]
        });
        if (!category) throw new Error('Category not found');

        return res.response({
            success: true,
            data: category,
        });
    } catch (error) {
        console.error('Error fetching category by id:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Admin fetch categories
const AdminCategories = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (search) {
            where.name = { [Op.like]: `%${search}%` };
        }

        const { rows, count } = await Categories.findAndCountAll({
            include:[
                {
                    model: Files,
                }
            ],
            where,
            limit,
            offset,
        });

       
      const category_mapped = rows.map(async (category) => {
        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          category_image: category.file?.files_url ? await FileFunctions.getFromS3(category.file.files_url) : null,
          description: category.description,
          is_active: category.is_active,
        };
      });

        return res.response({
            success: true,
            message: 'Categories fetched successfully',
            total: count,
            page,
            limit,
            data: await Promise.all(category_mapped),
        });
    } catch (error) {
        console.error('Error fetching admin categories:', error);
        return res.response({ success: false, message: error.message });
    }
};

// User fetch categories
const UserCategories = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (page - 1) * limit;

        const where = { is_active: true };
        if (search) {
            where.name = { [Op.like]: `%${search}%` };
        }

        const { rows, count } = await Categories.findAndCountAll({
            include:[
                {
                    model: Files,
                }
            ],
            where,
            limit,
            offset,
        });

        const category_mapped = rows.map(async (category) => {
          return {
            id: category.id,
            name: category.name,
            slug: category.slug,
            category_image: category.file?.files_url ? await FileFunctions.getFromS3(category.file.files_url) : null,
            description: category.description,
            is_active: category.is_active,
          };
        });

        return res.response({
            success: true,
            message: 'Categories fetched successfully',
            total: count,
            page,
            limit,
            data: await Promise.all(category_mapped),
        });
    } catch (error) {
        console.error('Error fetching user categories:', error);
        return res.response({ success: false, message: error.message });
    }
};

module.exports = {
    CreateCategory,
    UpdateCategory,
    DeleteCategory,
    GetCategoryById,
    AdminCategories,
    UserCategories,
};
