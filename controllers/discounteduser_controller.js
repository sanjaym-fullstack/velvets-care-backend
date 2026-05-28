'use strict';
const { DiscountedUsers: DiscountedUser, Users, Discounts: Discount } = require('../models');

// Assign Discount to User
const CreateDiscountedUser = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { user_id, discount_id } = req.payload;

        const [user, discount] = await Promise.all([
            Users.findByPk(user_id),
            Discount.findByPk(discount_id)
        ]);
        if (!user) throw new Error('User not found');
        if (!discount) throw new Error('Discount not found');

        const discountedUser = await DiscountedUser.create({
            user_id,
            discount_id,
            used_count: 0
        });

        return res.response({
            success: true,
            message: 'Discount assigned to user successfully',
            data: discountedUser
        }).code(201);
    } catch (error) {
        console.error('Error assigning discount to user:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Update Discounted User
const UpdateDiscountedUser = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { id } = req.params;
        const updates = req.payload;

        const discountedUser = await DiscountedUser.findOne({ where: { id } });
        if (!discountedUser) throw new Error('Discounted user not found');

        if (updates.user_id) {
            const user = await Users.findByPk(updates.user_id);
            if (!user) throw new Error('User not found');
        }
        if (updates.discount_id) {
            const discount = await Discount.findByPk(updates.discount_id);
            if (!discount) throw new Error('Discount not found');
        }

        await discountedUser.update(updates);

        return res.response({
            success: true,
            message: 'Discounted user updated successfully',
            data: discountedUser
        });
    } catch (error) {
        console.error('Error updating discounted user:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Delete Discounted User
const DeleteDiscountedUser = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { id } = req.params;
        const discountedUser = await DiscountedUser.findOne({ where: { id } });
        if (!discountedUser) throw new Error('Discounted user not found');

        await discountedUser.destroy();

        return res.response({
            success: true,
            message: 'Discounted user deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting discounted user:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Fetch Discounted Users (Admin)
const GetDiscountedUsers = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const { rows, count } = await DiscountedUser.findAndCountAll({
            include: [Users, Discount],
            limit,
            offset
        });

        return res.response({
            success: true,
            message: 'Discounted users fetched successfully',
            total: count,
            page,
            limit,
            data: rows
        });
    } catch (error) {
        console.error('Error fetching discounted users:', error);
        return res.response({ success: false, message: error.message });
    }
};

module.exports = {
    CreateDiscountedUser,
    UpdateDiscountedUser,
    DeleteDiscountedUser,
    GetDiscountedUsers
};
