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

const addressModel = require('./address');
const userModel = require('./users');


class Order extends Model {
}
Order.init({
  user_id: DataTypes.INTEGER,
  address_id: DataTypes.INTEGER,
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

addressModel.hasMany(Order, { foreignKey: 'address_id' });
Order.belongsTo(addressModel, { foreignKey: 'address_id' });

userModel.hasMany(Order, { foreignKey: 'user_id' });
Order.belongsTo(userModel, { foreignKey: 'user_id' });


module.exports = Order;