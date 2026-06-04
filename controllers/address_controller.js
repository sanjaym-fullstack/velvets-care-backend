'use strict';
const { Adresses, Users } = require('../models');

const addAddress = async (req, h) => {
    try {
        const session_user = req.headers.user;
        if (!session_user || !session_user.user_id) throw new Error('Session expired');

        const { street, area, city, state, country, zip, landmark, latitude, longitude } = req.payload;

        const user = await Users.findByPk(session_user.user_id);
        if (!user) throw new Error('User not found');

        const address = await Adresses.create({
            user_id: session_user.user_id,
            street, area, city, state, country, zip, landmark, latitude, longitude
        });

        return h.response({
            success: true,
            message: 'Address added successfully',
            data: address
        }).code(201);
    } catch (err) {
        console.error(err);
        return h.response({ success: false, message: err.message }).code(400);
    }
};

const getAddresses = async (req, h) => {
    try {
        const session_user = req.headers.user;
        if (!session_user || !session_user.user_id) throw new Error('Session expired');

        const addresses = await Adresses.findAll({
            where: { user_id: session_user.user_id }
        });

        return h.response({
            success: true,
            message: 'Addresses fetched successfully',
            data: addresses
        }).code(200);
    } catch (err) {
        console.error(err);
        return h.response({ success: false, message: err.message }).code(400);
    }
};

const updateAddress = async (req, h) => {
    try {
        const session_user = req.headers.user;
        if (!session_user || !session_user.user_id) throw new Error('Session expired');

        const { id } = req.params;
        const { street, area, city, state, country, zip, landmark, latitude, longitude } = req.payload;

        const address = await Adresses.findOne({
            where: { id, user_id: session_user.user_id }
        });
        if (!address) throw new Error('Address not found');

        await address.update({ street, area, city, state, country, zip, landmark, latitude, longitude });

        return h.response({
            success: true,
            message: 'Address updated successfully',
            data: address
        }).code(200);
    } catch (err) {
        console.error(err);
        return h.response({ success: false, message: err.message }).code(400);
    }
};

const deleteAddress = async (req, h) => {
    try {
        const session_user = req.headers.user;
        if (!session_user || !session_user.user_id) throw new Error('Session expired');

        const { id } = req.params;

        const address = await Adresses.findOne({
            where: { id, user_id: session_user.user_id }
        });
        if (!address) throw new Error('Address not found');

        await address.destroy();

        return h.response({
            success: true,
            message: 'Address deleted successfully'
        }).code(200);
    } catch (err) {
        console.error(err);
        return h.response({ success: false, message: err.message }).code(400);
    }
};

module.exports = {
    addAddress,
    getAddresses,
    updateAddress,
    deleteAddress
};
