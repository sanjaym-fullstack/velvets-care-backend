'use strict';

const { tables } = require('../config');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.addColumn(tables.Products, 'mrp_price', {
      type: Sequelize.DOUBLE,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.addColumn(tables.Products, 'selling_price', {
      type: Sequelize.DOUBLE,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.addColumn(tables.Products, 'sku', {
      type: Sequelize.STRING,
      unique: true
    });

    await queryInterface.addColumn(tables.Products, 'category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: tables.Categories,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addColumn(tables.Products, 'sub_category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: tables.Subcategories,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addColumn(tables.Products, 'brand_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: tables.Brands,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addColumn(tables.Products, 'tags', {
      type: Sequelize.TEXT
    });

    await queryInterface.addColumn(tables.Products, 'is_active', {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    });

    await queryInterface.addColumn(tables.Products, 'is_featured', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    await queryInterface.addColumn(tables.Products, 'is_new', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    await queryInterface.addColumn(tables.Products, 'stock', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    });

    // remove old price column
    await queryInterface.removeColumn(tables.Products, 'price');
  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeColumn(tables.Products, 'mrp_price');
    await queryInterface.removeColumn(tables.Products, 'selling_price');
    await queryInterface.removeColumn(tables.Products, 'sku');
    await queryInterface.removeColumn(tables.Products, 'category_id');
    await queryInterface.removeColumn(tables.Products, 'sub_category_id');
    await queryInterface.removeColumn(tables.Products, 'brand_id');
    await queryInterface.removeColumn(tables.Products, 'tags');
    await queryInterface.removeColumn(tables.Products, 'is_active');
    await queryInterface.removeColumn(tables.Products, 'is_featured');
    await queryInterface.removeColumn(tables.Products, 'is_new');
    await queryInterface.removeColumn(tables.Products, 'stock');

    await queryInterface.addColumn(tables.Products, 'price', {
      type: Sequelize.FLOAT
    });
  }
};