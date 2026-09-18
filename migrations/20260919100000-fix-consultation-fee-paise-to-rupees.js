'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Fix old appointments where consultation_fee was stored in paise (e.g., 75000 = ₹750)
    // Any value > 50000 is likely paise — divide by 100
    await queryInterface.sequelize.query(`
      UPDATE appointments 
      SET consultation_fee = ROUND(consultation_fee / 100, 2) 
      WHERE consultation_fee > 50000
    `);

    // Fix old doctors where consultation_fee was stored in paise
    await queryInterface.sequelize.query(`
      UPDATE doctors 
      SET consultation_fee = ROUND(consultation_fee / 100, 2) 
      WHERE consultation_fee > 50000
    `);
  },

  async down(queryInterface, Sequelize) {
    // Reverse: multiply back by 100
    await queryInterface.sequelize.query(`
      UPDATE appointments 
      SET consultation_fee = consultation_fee * 100 
      WHERE consultation_fee < 5000
    `);
    await queryInterface.sequelize.query(`
      UPDATE doctors 
      SET consultation_fee = consultation_fee * 100 
      WHERE consultation_fee < 5000
    `);
  }
};
