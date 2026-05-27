'use strict';
const {
  tables: {
    Products
  },
  sequelize
} = require('../config')

const {
  Model,
  DataTypes
} = require('sequelize');

const Brands = require('./brand');
const Categories = require('./category');
const Subcategories = require('./subcategory');

  class Product extends Model {
  }
  Product.init({
    name: DataTypes.STRING,
    mrp_price: DataTypes.DOUBLE,
    selling_price: DataTypes.DOUBLE,
    sku: DataTypes.STRING,
    category_id: DataTypes.INTEGER,
    sub_category_id: DataTypes.INTEGER,
    brand_id: DataTypes.INTEGER,
    tags: DataTypes.TEXT,
    is_active: DataTypes.BOOLEAN,
    is_featured: DataTypes.BOOLEAN,
    is_new: DataTypes.BOOLEAN,
    stock: DataTypes.INTEGER,
    description: DataTypes.TEXT,
  }, {
    sequelize,
    paranoid: true,
    modelName: Products,
    tableName: Products,
  });

  Product.belongsTo(Categories, { foreignKey: 'category_id', onDelete: 'CASCADE' });
  Categories.hasMany(Product, { foreignKey: 'category_id', onDelete: 'CASCADE' });

  Product.belongsTo(Brands, { foreignKey: 'brand_id', onDelete: 'CASCADE' });
  Brands.hasMany(Product, { foreignKey: 'brand_id', onDelete: 'CASCADE' });

  Product.belongsTo(Subcategories, { foreignKey: 'sub_category_id', onDelete: 'CASCADE' });
  Subcategories.hasMany(Product, { foreignKey: 'sub_category_id', onDelete: 'CASCADE' });

  // Product.hasMany(Reviews, { foreignKey: 'product_id' });
  // Reviews.belongsTo(Product, { foreignKey: 'product_id' });
  
module.exports = Product;