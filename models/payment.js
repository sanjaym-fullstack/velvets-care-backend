'use strict';
const {
  Model,
  DataTypes
} = require('sequelize');
const{
  tables: {
    Payments
  },
  sequelize
} = require('../config');
const Order = require('./order');
  class Payment extends Model {
  }
  Payment.init({
    order_id: DataTypes.INTEGER,
    payment_status: DataTypes.STRING,
    payment_method: DataTypes.STRING,
    payment_reference_id: DataTypes.STRING,
    amount: DataTypes.DOUBLE,
    currency: DataTypes.STRING,
    razorpay_order_id: DataTypes.STRING,
    razorpay_payment_response: DataTypes.JSON,
    notes: DataTypes.JSON
  }, {
    sequelize,
    modelName: Payments,
    tableName: Payments,
    paranoid: true
  });

  Payment.belongsTo(Order, { foreignKey: 'order_id' });
  Order.hasMany(Payment, { foreignKey: 'order_id' });

module.exports = Payment;