'use strict';
const {
  Model,
  DataTypes
} = require('sequelize');
const {
 tables: {
    Orders
  },
  sequelize
} = require('../config');
  

  class Order extends Model {
  }
  Order.init({
    user_id: DataTypes.INTEGER,
    total_amount: DataTypes.DOUBLE,
    status: DataTypes.STRING,
    payment_status: DataTypes.STRING,
    payment_method: DataTypes.STRING,
    discount_code: DataTypes.STRING,
    notes: DataTypes.JSON
  }, {
    sequelize,
    paranoid: true,
    modelName: Orders,
    tableName: Orders,
  });

module.exports = Order;