'use strict';
const {
  Model,
  DataTypes
} = require('sequelize');

const{
  tables: {
    Subcategories
  },
  sequelize
} = require('../config');

const Category = require('./category');
const Files = require('./files');

class SubCategory extends Model {
}
SubCategory.init({
  name: DataTypes.STRING,
    slug: DataTypes.STRING,
    is_active: DataTypes.BOOLEAN,
    description: DataTypes.TEXT,
    subcategory_image: DataTypes.INTEGER,
    category_id: DataTypes.INTEGER
  }, {
    sequelize,
    paranoid: true,
    modelName: Subcategories,
  });

  SubCategory.belongsTo(Category, { foreignKey: 'category_id', onDelete: 'CASCADE' });
  Category.hasMany(SubCategory, { foreignKey: 'category_id', onDelete: 'CASCADE' });

  SubCategory.belongsTo(Files, { foreignKey: 'subcategory_image', onDelete: 'CASCADE' });
  Files.hasMany(SubCategory, { foreignKey: 'subcategory_image', onDelete: 'CASCADE' });

  SubCategory.beforeDestroy(async (subcategory, options) => {
    const Product = subcategory.sequelize.models.products;
    await Product.destroy({ where: { sub_category_id: subcategory.id }, individualHooks: true, transaction: options.transaction });
  });

module.exports = SubCategory;