'use strict';
const {
  Model,
  DataTypes
} = require('sequelize');

const{
  tables: {
    DiscountedProducts
  },
  sequelize
} = require('../config');
const Discount = require('./discount');
const Product = require('./product');
  class DiscountedProduct extends Model {
    
  }
  DiscountedProduct.init({
    product_id: DataTypes.INTEGER,
    discount_id: DataTypes.INTEGER,
    usage_limit: DataTypes.INTEGER
  }, {
    sequelize,
    paranoid: true,
    modelName: DiscountedProducts,
    tableName: DiscountedProducts,
  });

  DiscountedProduct.belongsTo(Discount, { foreignKey: 'discount_id' });
  Discount.hasMany(DiscountedProduct, { foreignKey: 'discount_id' });

  DiscountedProduct.belongsTo(Product, { foreignKey: 'product_id' });
  Product.hasMany(DiscountedProduct, { foreignKey: 'product_id' });

module.exports = DiscountedProduct;