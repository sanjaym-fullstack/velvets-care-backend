const Joi = require('joi');
const HeaderValidator = Joi.object({
    authorization: Joi.string().required().messages({
        'string.empty': 'Authorization is required',
        'any.required': 'Authorization is required',
    }),
}).unknown()

module.exports = {
    HeaderValidator,
    UserValidators: require('./users_validators'),
    ShopValidators: require('./shop_validators'),
    AdminValidator: require('./admin_validator'),
    BannerValidator: require('./banner_validator'),
    DoctorValidator: require('./doctor_validator'),
    DoctorAuthValidator: require('./doctor_auth_validator'),
    ClinicValidator: require('./clinic_validator'),
    AppointmentValidator: require('./appointment_validator'),
    SpecializationValidator: require('./specilization_validator'),
    ProductValidator: require('./product_validator'),
    CategoryValidator: require('./category_validator'),
    SubCategoryValidator: require('./subcategory_validator'),
    BrandValidator: require('./brand_validator'),
    CartValidator: require('./cart_validator'),
    WishlistValidator: require('./wishlist_validator'),
    DiscountValidator: require('./discount_validator'),
    DiscountedUserValidator: require('./discounteduser_validator'),
    DiscountedProductValidator: require('./discountedproduct_validator'),
    OrderValidator: require('./order_validator'),
    DashboardValidator: require('./dashboard_validator'),
    PrescriptionValidator: require('./prescription_validator'),
    CheckoutValidator: require('./checkout_validator'),

}