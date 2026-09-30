'use strict';

// Order refunds. The Razorpay payment id stays on the `payments` row
// (payment_reference_id); these columns only record the outcome so a cancelled
// order can show what was refunded and admins can spot failures.
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const normalized = tables.map((t) =>
      (typeof t === 'string' ? t : t.tableName).toLowerCase()
    );

    if (!normalized.includes('orders')) {
      throw new Error('orders table not found — run the base migrations first');
    }

    await queryInterface.addColumn('orders', 'refund_id', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'payment_method'
    });
    await queryInterface.addColumn('orders', 'refund_amount', {
      type: Sequelize.DOUBLE,
      allowNull: true,
      after: 'refund_id'
    });
    await queryInterface.addColumn('orders', 'refund_status', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
      after: 'refund_amount'
    });
    await queryInterface.addColumn('orders', 'refund_date', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'refund_status'
    });
    await queryInterface.addColumn('orders', 'refund_reason', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'refund_date'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('orders', 'refund_id');
    await queryInterface.removeColumn('orders', 'refund_amount');
    await queryInterface.removeColumn('orders', 'refund_status');
    await queryInterface.removeColumn('orders', 'refund_date');
    await queryInterface.removeColumn('orders', 'refund_reason');
  }
};
