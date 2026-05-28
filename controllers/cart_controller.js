'use strict';
const { Carts: Cart, Users, Products, ProductImages, Brands, Categories, Subcategories } = require('../models');
const { sequelize } = require('../config');

// Add product to cart
const AddToCart = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { product_id, quantity = 1 } = req.payload;

        const product = await Products.findByPk(product_id);
        if (!product) throw new Error('Product not found');

        const cartItem = await Cart.findOne({
            where: { user_id: session_user.user_id, product_id }
        });

        if (cartItem) {
            await cartItem.update({ quantity: cartItem.quantity + quantity });
            return res.response({
                success: true,
                message: 'Product quantity updated in cart',
                data: cartItem
            });
        }

        const newItem = await Cart.create({
            user_id: session_user.user_id,
            product_id,
            quantity
        });

        return res.response({
            success: true,
            message: 'Product added to cart',
            data: newItem
        }).code(201);
    } catch (error) {
        console.error('Error adding to cart:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Remove product from cart
const RemoveFromCart = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { id } = req.params;
        const cartItem = await Cart.findOne({ where: { id, user_id: session_user.user_id } });
        if (!cartItem) throw new Error('Cart item not found');

        await cartItem.destroy();

        return res.response({
            success: true,
            message: 'Product removed from cart'
        });
    } catch (error) {
        console.error('Error removing from cart:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Increment quantity
const IncrementCartItem = async (req, res) => {
    try {
        const session_user = req.headers.user;
        const { id } = req.params;

        const cartItem = await Cart.findOne({ where: { id, user_id: session_user.user_id } });
        if (!cartItem) throw new Error('Cart item not found');

        await cartItem.update({ quantity: cartItem.quantity + 1 });

        return res.response({
            success: true,
            message: 'Cart item quantity incremented',
            data: cartItem
        });
    } catch (error) {
        console.error('Error incrementing cart item:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Decrement quantity
const DecrementCartItem = async (req, res) => {
    try {
        const session_user = req.headers.user;
        const { id } = req.params;

        const cartItem = await Cart.findOne({ where: { id, user_id: session_user.user_id } });
        if (!cartItem) throw new Error('Cart item not found');

        if (cartItem.quantity <= 1) {
            await cartItem.destroy();
            return res.response({
                success: true,
                message: 'Cart item removed as quantity reached zero'
            });
        }

        await cartItem.update({ quantity: cartItem.quantity - 1 });

        return res.response({
            success: true,
            message: 'Cart item quantity decremented',
            data: cartItem
        });
    } catch (error) {
        console.error('Error decrementing cart item:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Get user's cart
const GetCart = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const cartItems = await Cart.findAll({
            where: { user_id: session_user.user_id },
            include: [{
                model: Products,
                include: [ProductImages, Brands, Categories, Subcategories]
            }]
        });

        return res.response({
            success: true,
            data: cartItems
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        return res.response({ success: false, message: error.message });
    }
};

// Admin: Get cart count per user
const AdminCartStats = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user || !session_user.is_admin) throw new Error('Unauthorized');

        const cartStats = await Cart.findAll({
            attributes: [
                'user_id',
                [sequelize.fn('SUM', sequelize.col('quantity')), 'cart_count']
            ],
            group: ['user_id'],
            raw: true
        });

        return res.response({
            success: true,
            message: 'Cart stats fetched successfully',
            data: cartStats
        });
    } catch (error) {
        console.error('Error fetching cart stats:', error);
        return res.response({ success: false, message: error.message });
    }
};

module.exports = {
    AddToCart,
    RemoveFromCart,
    IncrementCartItem,
    DecrementCartItem,
    GetCart,
    AdminCartStats
};
