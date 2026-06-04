const {
    SessionValidator,
} = require('../middlewares');
const Boom = require('@hapi/boom');
const {
    AddressController: {
        addAddress,
        getAddresses,
        updateAddress,
        deleteAddress
    }
} = require('../controllers');
const {
    AddressValidator: {
        addAddressValidator,
        updateAddressValidator,
        addressIdParamValidator,
        getAddressesValidator,
    },
    HeaderValidator,
} = require('../validators');

const tags = ["api", "Address"];

module.exports = [
    {
        method: 'POST',
        path: '/doctor/address',
        options: {
            description: 'Add a new address for doctor',
            tags,
            pre: [SessionValidator],
            validate: {
                payload: addAddressValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },
        },
        handler: addAddress,
    },
    {
        method: 'GET',
        path: '/doctor/address',
        options: {
            description: 'Get addresses for a doctor',
            tags,
            pre: [SessionValidator],
            validate: {
                query: getAddressesValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },
        },
        handler: getAddresses,
    },
    {
        method: 'PUT',
        path: '/doctor/address/{id}',
        options: {
            description: 'Update an address',
            tags,
            pre: [SessionValidator],
            validate: {
                params: addressIdParamValidator,
                payload: updateAddressValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },
        },
        handler: updateAddress,
    },
    {
        method: 'DELETE',
        path: '/doctor/address/{id}',
        options: {
            description: 'Delete an address',
            tags,
            pre: [SessionValidator],
            validate: {
                params: addressIdParamValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },
        },
        handler: deleteAddress,
    },
];
