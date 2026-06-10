'use strict';
const {
  Model,
  DataTypes
} = require('sequelize');

const{
  tables: {
    Categories
  },
  sequelize
} = require('../config');
const Files = require('./files');
  class Category extends Model {
  }
  Category.init({
    name: DataTypes.STRING,
    slug: DataTypes.STRING,
    description: DataTypes.TEXT,
    category_image: DataTypes.INTEGER,
    is_active: DataTypes.BOOLEAN
  }, {
    sequelize,
    paranoid: true,
    modelName: Categories,
  });

  Category.belongsTo(Files, { foreignKey: 'category_image', onDelete: 'CASCADE' });
  Files.hasMany(Category, { foreignKey: 'category_image', onDelete: 'CASCADE' });

  Category.beforeDestroy(async (category, options) => {
    const { Op } = require('sequelize');
    const SubCategory = category.sequelize.models.subcategories;
    const Product = category.sequelize.models.products;

    const subcategories = await SubCategory.findAll({
      where: { category_id: category.id },
      transaction: options.transaction,
    });
    const subcategoryIds = subcategories.map(s => s.id);

    await SubCategory.destroy({ where: { category_id: category.id }, transaction: options.transaction });
    await Product.destroy({
      where: {
        [Op.or]: [
          { category_id: category.id },
          { sub_category_id: subcategoryIds },
        ],
      },
      individualHooks: true,
      transaction: options.transaction,
    });
  });

module.exports = Category;