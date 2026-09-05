const  Joi  = require('joi');

const bannerValidator = Joi.object({
    image: Joi.any()
    .meta({ swaggerType: 'file' })
    .description('Image file of the banner')
    .required().messages({
        'any.required': 'Image is required',
        'string.empty': 'Image is required',
    }),
    title: Joi.string().required().messages({
        'string.base': 'Title must be a string',
        'string.empty': 'Title is required',
        'any.required': 'Title is required',
    }),
})

const deleteBannerValidator = Joi.object({
    banner_id: Joi.number().required().messages({
        'number.base': 'Banner ID must be a number',
        'any.required': 'Banner ID is required',
    }),
})

const allBanners = Joi.object({
    page: Joi.number().allow(null).messages({
        'number.base': 'Page must be a number',
    }),
    limit: Joi.number().allow(null).messages({
        'number.base': 'Limit must be a number',
    }),
})


module.exports = {
    bannerValidator,
    deleteBannerValidator,
    allBanners
}