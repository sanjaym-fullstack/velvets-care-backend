'use strict';
const { Op } = require('sequelize');
const {
    Discounts: Discount,
    DiscountedProducts: DiscountedProduct,
    DiscountedUsers: DiscountedUser,
    Products,
    ProductImages,
    Users
} = require('../models');

// Create Discount
const CreateDiscount = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { name, code, type, value, start_date, end_date, usage_limit, is_active } = req.payload;

        const existing = await Discount.findOne({ where: { code } });
        if (existing) throw new Error('Discount with this code already exists');

        const discount = await Discount.create({
            name, code, type, value, start_date, end_date, usage_limit, is_active
        });

        return res.response({
            success: true,
            message: 'Discount created successfully',
            data: discount
        }).code(201);
    } catch (error) {
        console.error('Error creating discount:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Update Discount
const UpdateDiscount = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { id } = req.params;
        const updates = req.payload;

        const discount = await Discount.findOne({ where: { id } });
        if (!discount) throw new Error('Discount not found');

        await discount.update(updates);

        return res.response({
            success: true,
            message: 'Discount updated successfully',
            data: discount
        });
    } catch (error) {
        console.error('Error updating discount:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Delete Discount
const DeleteDiscount = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { id } = req.params;
        const discount = await Discount.findOne({ where: { id } });
        if (!discount) throw new Error('Discount not found');

        await discount.destroy();

        return res.response({
            success: true,
            message: 'Discount deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting discount:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Get Discount By ID
const GetDiscountById = async (req, res) => {
    try {
        const { id } = req.params;

        const discount = await Discount.findOne({
            where: { id },
            include: [
                { model: DiscountedProduct, include: [{ model: Products, include: [ProductImages] }] },
                { model: DiscountedUser, include: [Users] }
            ]
        });

        if (!discount) throw new Error('Discount not found');

        return res.response({
            success: true,
            data: discount
        });
    } catch (error) {
        console.error('Error fetching discount:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Admin Fetch Discounts (with pagination + search)
const AdminDiscounts = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { code: { [Op.like]: `%${search}%` } },
            ];
        }

        const { rows, count } = await Discount.findAndCountAll({
            where,
            limit,
            offset,
            include: [
                { model: DiscountedProduct, include: [Products] },
                { model: DiscountedUser, include: [Users] }
            ]
        });

        return res.response({
            success: true,
            message: 'Discounts fetched successfully',
            total: count,
            page,
            limit,
            data: rows
        });
    } catch (error) {
        console.error('Error fetching discounts:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Assign Discount to Product
const AssignDiscountToProduct = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { discount_id, product_id, usage_limit } = req.payload;

        const [product, discount] = await Promise.all([
            Products.findByPk(product_id),
            Discount.findByPk(discount_id)
        ]);
        if (!product) throw new Error('Product not found');
        if (!discount) throw new Error('Discount not found');

        const discountedProduct = await DiscountedProduct.create({
            discount_id,
            product_id,
            usage_limit: usage_limit || null
        });

        return res.response({
            success: true,
            message: 'Discount assigned to product successfully',
            data: discountedProduct
        });
    } catch (error) {
        console.error('Error assigning discount to product:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Assign Discount to User
const AssignDiscountToUser = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { discount_id, user_id } = req.payload;

        const [user, discount] = await Promise.all([
            Users.findByPk(user_id),
            Discount.findByPk(discount_id)
        ]);
        if (!user) throw new Error('User not found');
        if (!discount) throw new Error('Discount not found');

        const discountedUser = await DiscountedUser.create({
            discount_id,
            user_id,
            used_count: 0
        });

        return res.response({
            success: true,
            message: 'Discount assigned to user successfully',
            data: discountedUser
        });
    } catch (error) {
        console.error('Error assigning discount to user:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Validate Discount Usage
const ValidateDiscountUsage = async (req, res) => {
    try {
        const { discount_code, user_id, product_id } = req.payload;

        const discount = await Discount.findOne({ where: { code: discount_code, is_active: true } });
        if (!discount) throw new Error('Discount not found or inactive');

        if (new Date(discount.start_date) > new Date() || new Date(discount.end_date) < new Date()) {
            throw new Error('Discount is not valid at this time');
        }

        if (discount.usage_limit !== null) {
            const usedCount = await DiscountedUser.sum('used_count', { where: { discount_id: discount.id } });
            if (usedCount >= discount.usage_limit) throw new Error('Discount usage limit reached');
        }

        const discountedUser = await DiscountedUser.findOne({ where: { discount_id: discount.id, user_id } });
        if (discountedUser && discountedUser.used_count >= (discountedUser.usage_limit || discount.usage_limit)) {
            throw new Error('User has reached discount usage limit');
        }

        const discountedProduct = await DiscountedProduct.findOne({ where: { discount_id: discount.id, product_id } });
        if (!discountedProduct) throw new Error('Discount not applicable for this product');

        return res.response({
            success: true,
            message: 'Discount is valid',
            data: discount
        });
    } catch (error) {
        console.error('Error validating discount:', error);
        return res.response({ success: false, message: error.message });
    }
};

module.exports = {
    CreateDiscount,
    UpdateDiscount,
    DeleteDiscount,
    GetDiscountById,
    AdminDiscounts,
    AssignDiscountToProduct,
    AssignDiscountToUser,
    ValidateDiscountUsage
};
