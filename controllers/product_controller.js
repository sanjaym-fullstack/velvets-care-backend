'use strict';

const fs = require('fs');
const { Op } = require('sequelize');

const {
    Products,
    ProductImages,
    Categories,
    Subcategories,
    Brands,
} = require('../models');

const {
    FileFunctions,
} = require('../helpers');


// ============================
// Create Product
// ============================
const CreateProduct = async (req, res) => {
    try {

        const session_user = req.headers.user;
        if (!session_user) {
            throw new Error('Session expired');
        }

        const {
            name,
            mrp_price,
            selling_price,
            sku,
            category_id,
            sub_category_id,
            brand_id,
            tags,
            is_active,
            is_featured,
            is_new,
            stock,
            description,
        } = req.payload;

        // validations
        if (!name) throw new Error('Product name is required');
        if (mrp_price == null) throw new Error('MRP price is required');
        if (selling_price == null) throw new Error('Selling price is required');
        if (!sku) throw new Error('SKU is required');

        if (mrp_price < 0 || selling_price < 0) {
            throw new Error('Price cannot be negative');
        }

        if (stock < 0) {
            throw new Error('Stock cannot be negative');
        }

        // check duplicate sku
        const existing = await Products.findOne({
            where: { sku }
        });

        if (existing) {
            throw new Error('Product with this SKU already exists');
        }

        // normalize falsy FK values to null (0, '', etc.)
        const resolvedCategoryId = category_id || null;
        const resolvedSubCategoryId = sub_category_id || null;
        const resolvedBrandId = brand_id || null;

        // validate foreign keys exist
        if (resolvedCategoryId) {
            const category = await Categories.findByPk(resolvedCategoryId);
            if (!category) throw new Error('Category not found');
        }
        if (resolvedSubCategoryId) {
            const subcategory = await Subcategories.findByPk(resolvedSubCategoryId);
            if (!subcategory) throw new Error('Subcategory not found');
        }
        if (resolvedBrandId) {
            const brand = await Brands.findByPk(resolvedBrandId);
            if (!brand) throw new Error('Brand not found');
        }

        // create product
        const product = await Products.create({
            name,
            mrp_price,
            selling_price,
            sku,
            category_id: resolvedCategoryId,
            sub_category_id: resolvedSubCategoryId,
            brand_id: resolvedBrandId,
            tags: tags ?? null,
            is_active: is_active ?? true,
            is_featured: is_featured ?? false,
            is_new: is_new ?? false,
            stock: stock ?? 0,
            description: description ?? null,
        });

        return res.response({
            success: true,
            message: 'Product created successfully',
            data: product,
        }).code(201);

    } catch (error) {

        console.error('Error creating product:', error);

        return res.response({
            success: false,
            message: error.message
        }).code(400);
    }
};


// ============================
// Update Product
// ============================
const UpdateProduct = async (req, res) => {
    try {

        const session_user = req.headers.user;

        if (!session_user) {
            throw new Error('Session expired');
        }

        const { id } = req.params;

        const updates = req.payload;

        const product = await Products.findOne({
            where: { id }
        });

        if (!product) {
            throw new Error('Product not found');
        }

        // check duplicate sku
        if (updates.sku) {

            const existing = await Products.findOne({
                where: {
                    sku: updates.sku,
                    id: {
                        [Op.ne]: id
                    }
                }
            });

            if (existing) {
                throw new Error('SKU already exists');
            }
        }

        await product.update(updates);

        return res.response({
            success: true,
            message: 'Product updated successfully',
            data: product,
        });

    } catch (error) {

        console.error('Error updating product:', error);

        return res.response({
            success: false,
            message: error.message
        }).code(400);
    }
};


// ============================
// Delete Product
// ============================
const DeleteProduct = async (req, res) => {
    try {

        const session_user = req.headers.user;

        if (!session_user) {
            throw new Error('Session expired');
        }

        const { id } = req.params;

        const product = await Products.findOne({
            where: { id }
        });

        if (!product) {
            throw new Error('Product not found');
        }

        await product.destroy();

        return res.response({
            success: true,
            message: 'Product deleted successfully',
        });

    } catch (error) {

        console.error('Error deleting product:', error);

        return res.response({
            success: false,
            message: error.message
        }).code(400);
    }
};


// ============================
// Get Product By ID
// ============================
const GetProductById = async (req, res) => {
    try {

        const session_user = req.headers.user;
        if (!session_user) {
            throw new Error('Session expired');
        }

        const { id } = req.params;

        const product = await Products.findOne({
            where: { id },

            include: [
                {
                    model: ProductImages,
                },
                {
                    model: Brands,
                },
                {
                    model: Categories,
                },
                {
                    model: Subcategories,
                },
            ],
        });

        if (!product) {
            throw new Error('Product not found');
        }

        const productJSON = product.toJSON();

        // image urls
        productJSON.ProductImages = await Promise.all(
            (productJSON.ProductImages || []).map(async (img) => ({
                ...img,
                file_url: img.file_url
                    ? await FileFunctions.getFromS3(img.file_url)
                    : null,
            }))
        );

        return res.response({
            success: true,
            data: productJSON
        });

    } catch (error) {

        console.error('Error fetching product:', error);

        return res.response({
            success: false,
            message: error.message
        }).code(400);
    }
};


// ============================
// Admin Products
// ============================
const AdminProducts = async (req, res) => {
    try {

        const session_user = req.headers.user;

        if (!session_user) {
            throw new Error('Session expired');
        }

        const {
            page = 1,
            limit = 10,
            search = ''
        } = req.query;

        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);

        const offset = (pageNumber - 1) * limitNumber;

        const where = {};

        if (search) {

            where[Op.or] = [
                {
                    name: {
                        [Op.like]: `%${search}%`
                    }
                },
                {
                    description: {
                        [Op.like]: `%${search}%`
                    }
                },
                {
                    sku: {
                        [Op.like]: `%${search}%`
                    }
                },
            ];
        }

        const { rows, count } = await Products.findAndCountAll({
            where,
            limit: limitNumber,
            offset,

            include: [
                Brands,
                Categories,
                Subcategories
            ],

            order: [['id', 'DESC']]
        });

        return res.response({
            success: true,
            message: 'Products fetched successfully',
            total: count,
            page: pageNumber,
            limit: limitNumber,
            data: rows,
        });

    } catch (error) {

        console.error('Error fetching products:', error);

        return res.response({
            success: false,
            message: error.message
        }).code(400);
    }
};


// ============================
// User Products
// ============================
const UserProducts = async (req, res) => {
    try {

        const session_user = req.headers.user;
        if (!session_user) {
            throw new Error('Session expired');
        }

        const {
            page = 1,
            limit = 10,
            search = ''
        } = req.query;

        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);

        const offset = (pageNumber - 1) * limitNumber;

        const where = {
            is_active: true
        };

        if (search) {

            where[Op.or] = [
                {
                    name: {
                        [Op.like]: `%${search}%`
                    }
                },
                {
                    description: {
                        [Op.like]: `%${search}%`
                    }
                },
                {
                    sku: {
                        [Op.like]: `%${search}%`
                    }
                },
            ];
        }

        const { rows, count } = await Products.findAndCountAll({

            where,

            limit: limitNumber,

            offset,

            include: [
                Brands,
                Categories,
                Subcategories
            ],

            order: [['id', 'DESC']]
        });

        return res.response({
            success: true,
            message: 'Products fetched successfully',
            total: count,
            page: pageNumber,
            limit: limitNumber,
            data: rows,
        });

    } catch (error) {

        console.error('Error fetching products:', error);

        return res.response({
            success: false,
            message: error.message
        }).code(400);
    }
};


// ============================
// Upload Product Images
// ============================
const UploadProductImage = async (req, res) => {
    try {

        const session_user = req.headers.user;

        if (!session_user) {
            throw new Error('Session expired');
        }

        const {
            product_id,
            files
        } = req.payload;

        if (!files || !files.length) {
            throw new Error('Files are required');
        }

        // check product
        const product = await Products.findByPk(product_id);

        if (!product) {
            throw new Error('Product not found');
        }

        const uploadedFiles = await Promise.all(

            files.map(async (file) => {

                const uploaded = await FileFunctions.uploadToS3(
                    file.filename,
                    'uploads/products',
                    fs.readFileSync(file.path)
                );

                return ProductImages.create({
                    product_id,
                    file_url: uploaded.key,
                    extension: uploaded.key.split('.').pop(),
                    original_name: file.filename,
                    size: fs.statSync(file.path).size,
                });
            })
        );

        return res.response({
            success: true,
            message: 'Product images uploaded successfully',
            data: uploadedFiles,
        }).code(201);

    } catch (error) {

        console.error('Error uploading images:', error);

        return res.response({
            success: false,
            message: error.message
        }).code(400);
    }
};


// ============================
// Delete Product Image
// ============================
const DeleteProductImage = async (req, res) => {
    try {

        const session_user = req.headers.user;

        if (!session_user) {
            throw new Error('Session expired');
        }

        const imageId = req.params.imageId;

        const image = await ProductImages.findByPk(imageId);

        if (!image) {
            throw new Error('Image not found');
        }

        // delete from s3
        if (image.file_url) {
            await FileFunctions.deleteFromS3(image.file_url);
        }

        await image.destroy();

        return res.response({
            success: true,
            message: 'Product image deleted successfully',
        });

    } catch (error) {

        console.error('Error deleting image:', error);

        return res.response({
            success: false,
            message: error.message
        }).code(400);
    }
};


// ============================
// Get Images By Product
// ============================
const GetImagesByProduct = async (req, res) => {
    try {

        const session_user = req.headers.user;
        if (!session_user) {
            throw new Error('Session expired');
        }

        const productId = req.params.id;

        const images = await ProductImages.findAll({
            where: {
                product_id: productId
            },
            raw: true
        });

        const imagesWithUrl = await Promise.all(

            images.map(async (img) => ({
                ...img,

                file_url: img.file_url
                    ? await FileFunctions.getFromS3(img.file_url)
                    : null
            }))
        );

        return res.response({
            success: true,
            data: imagesWithUrl,
        });

    } catch (error) {

        console.error('Error fetching images:', error);

        return res.response({
            success: false,
            message: error.message
        }).code(400);
    }
};


module.exports = {
    CreateProduct,
    UpdateProduct,
    DeleteProduct,
    DeleteProductImage,
    GetImagesByProduct,
    GetProductById,
    AdminProducts,
    UserProducts,
    UploadProductImage,
};