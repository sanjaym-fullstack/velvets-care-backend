'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Central phone registry: one row per phone, UNIQUE at the DB level.
    await queryInterface.createTable('accounts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Link columns (nullable so nothing breaks if a row is missed).
    await queryInterface.addColumn('users', 'account_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'id'
    });
    await queryInterface.addColumn('doctors', 'account_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'id'
    });
    await queryInterface.addIndex('users', ['account_id'], { name: 'users_account_id_idx' });
    await queryInterface.addIndex('doctors', ['account_id'], { name: 'doctors_account_id_idx' });

    // Backfill: one account per distinct phone found in either table.
    // doctors.phone is BIGINT, so cast it to CHAR before the UNION.
    await queryInterface.sequelize.query(`
      INSERT INTO accounts (phone, createdAt, updatedAt)
      SELECT phone, NOW(), NOW() FROM (
        SELECT phone FROM users WHERE phone IS NOT NULL AND phone <> ''
        UNION
        SELECT CAST(phone AS CHAR) FROM doctors WHERE phone IS NOT NULL AND phone <> 0
      ) AS all_phones
    `);

    await queryInterface.sequelize.query(`
      UPDATE users u INNER JOIN accounts a ON a.phone = u.phone
      SET u.account_id = a.id
    `);
    await queryInterface.sequelize.query(`
      UPDATE doctors d INNER JOIN accounts a ON a.phone = CAST(d.phone AS CHAR)
      SET d.account_id = a.id
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'users_account_id_idx');
    await queryInterface.removeIndex('doctors', 'doctors_account_id_idx');
    await queryInterface.removeColumn('users', 'account_id');
    await queryInterface.removeColumn('doctors', 'account_id');
    await queryInterface.dropTable('accounts');
  }
};
