'use strict';
const { DiscountedProducts: DiscountedProduct, Products, Discounts: Discount } = require('../models');

// Create / Assign Discounted Product
const CreateDiscountedProduct = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { product_id, discount_id, usage_limit } = req.payload;

        const discountedProduct = await DiscountedProduct.create({
            product_id,
            discount_id,
            usage_limit: usage_limit || null
        });

        return res.response({
            success: true,
            message: 'Discount assigned to product successfully',
            data: discountedProduct
        }).code(201);
    } catch (error) {
        console.error('Error creating discounted product:', error);
        return res.response({ success: false, message: error.message }).code(400);
    }
};

// Update Discounted Product
const UpdateDiscountedProduct = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { id } = req.params;
        const updates = req.payload;

        const discountedProduct = await DiscountedProduct.findOne({ where: { id } });
        if (!discountedProduct) throw new Error('Discounted product not found');

        await discountedProduct.update(updates);

        return res.response({
            success: true,
            message: 'Discounted product updated successfully',
            data: discountedProduct
        });
    } catch (error) {
        console.error('Error updating discounted product:', error);
        return res.response({ success: false, message: error.message }).code(400);
    }
};

// Delete Discounted Product
const DeleteDiscountedProduct = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { id } = req.params;
        const discountedProduct = await DiscountedProduct.findOne({ where: { id } });
        if (!discountedProduct) throw new Error('Discounted product not found');

        await discountedProduct.destroy();

        return res.response({
            success: true,
            message: 'Discounted product deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting discounted product:', error);
        return res.response({ success: false, message: error.message }).code(400);
    }
};

// Fetch Discounted Products (Admin)
const GetDiscountedProducts = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const { rows, count } = await DiscountedProduct.findAndCountAll({
            include: [Products, Discount],
            limit,
            offset
        });

        return res.response({
            success: true,
            message: 'Discounted products fetched successfully',
            total: count,
            page,
            limit,
            data: rows
        });
    } catch (error) {
        console.error('Error fetching discounted products:', error);
        return res.response({ success: false, message: error.message }).code(400);
    }
};

module.exports = {
    CreateDiscountedProduct,
    UpdateDiscountedProduct,
    DeleteDiscountedProduct,
    GetDiscountedProducts
};
