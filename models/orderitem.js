'use strict';
const {
  Model,
  DataTypes
} = require('sequelize');
const {
  tables: {
    OrderItems
  },
  sequelize
} = require('../config');
const Products = require('./product');
const Order = require('./order');

  class OrderItem extends Model {
  }
  OrderItem.init({
    order_id: DataTypes.INTEGER,
    product_id: DataTypes.INTEGER,
    quantity: DataTypes.INTEGER,
    price: DataTypes.DOUBLE,
    total: DataTypes.DOUBLE
  }, {
    sequelize,
    modelName: OrderItems,
    tableName: OrderItems,
    paranoid: true
  });

  OrderItem.belongsTo(Products, { foreignKey: 'product_id' });
  Products.hasMany(OrderItem, { foreignKey: 'product_id' });

  OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
  Order.hasMany(OrderItem, { foreignKey: 'order_id' });

module.exports = OrderItem;