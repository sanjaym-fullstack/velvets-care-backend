'use strict';
const {
  Model,
  DataTypes
} = require('sequelize');
const{
  tables: {
    Brands
  },
  sequelize
} = require('../config');
const Files = require('./files');

  class Brand extends Model {
  }
  Brand.init({
    name: DataTypes.STRING,
    slug: DataTypes.STRING,
    description: DataTypes.TEXT,
    brand_image: DataTypes.INTEGER,
    is_active: DataTypes.BOOLEAN
  }, {
    sequelize,
    paranoid: true,
    modelName: Brands,
  });

  Brand.belongsTo(Files, { foreignKey: 'brand_image', onDelete: 'CASCADE' });
  Files.hasMany(Brand, { foreignKey: 'brand_image', onDelete: 'CASCADE' });

  Brand.beforeDestroy(async (brand, options) => {
    const Product = brand.sequelize.models.products;
    await Product.destroy({ where: { brand_id: brand.id }, individualHooks: true, transaction: options.transaction });
  });

module.exports = Brand;
