'use strict';
const {
  tables: {
    Wishlists
  },
  sequelize
} = require('../config')

const {
  Model,
  DataTypes
} = require('sequelize');
  class Wishlist extends Model {
  }
  Wishlist.init({
    user_id: DataTypes.INTEGER,
    product_id: DataTypes.INTEGER
  }, {
    sequelize,
    paranoid: true,
    modelName: Wishlists,
  });

  Wishlist.belongsTo(require('./product'), { foreignKey: 'product_id' });
  Wishlist.belongsTo(require('./users'), { foreignKey: 'user_id' });

module.exports = Wishlist;