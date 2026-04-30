'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Widen status column from VARCHAR(20) → VARCHAR(25)
    await queryInterface.changeColumn('study_plan_courses', 'status', {
      type: Sequelize.STRING(25),
      defaultValue: 'pending',
      allowNull: true,
    });

    // 2. Migrate existing grade=4.00 / status=dropped → status=incomplete
    //    (4.00 now means "Incomplete" instead of "dropped")
    await queryInterface.sequelize.query(
      `UPDATE study_plan_courses
         SET status = 'incomplete', "updatedAt" = NOW()
       WHERE grade = '4.00' AND status = 'dropped' AND "deletedAt" IS NULL`,
    );
  },

  async down(queryInterface, Sequelize) {
    // Reverse the data migration first
    await queryInterface.sequelize.query(
      `UPDATE study_plan_courses
         SET status = 'dropped', "updatedAt" = NOW()
       WHERE grade = '4.00' AND status = 'incomplete' AND "deletedAt" IS NULL`,
    );

    // Shrink column back
    await queryInterface.changeColumn('study_plan_courses', 'status', {
      type: Sequelize.STRING(20),
      defaultValue: 'pending',
      allowNull: true,
    });
  },
};
