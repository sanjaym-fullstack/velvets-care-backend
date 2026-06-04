
const Boom = require('@hapi/boom');
// src/routes/authRoutes.js
const {
    ShopsControllers: {
        getFashionShops,
    },
    ReverseGeocodeController:{
        getAddress
    }

} = require('../controllers');
const {
    ShopValidators: {
        getshop, 
        Getlcoation_validator   
    },
    HeaderValidator,
} = require('../validators');

const tags = ["api", "Shops"];

module.exports = [
    {
        method: 'GET',
        path: '/shops',
        options: {
            description: 'Get all fashion shops',
            tags,
            validate: {
                query: getshop,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            }
        },
        handler: getFashionShops,
    },
   {
    method: 'GET',
    path: '/get_address',
    options:{
        description: 'get address from lat and long',
        tags,
        validate: {
            query: Getlcoation_validator,
            failAction: (request, h, err) => {
                const errors = err.details.map(e => e.message);
                throw Boom.badRequest(errors.join(', '));
            }
        }
    },
    handler: getAddress

   }
    ];