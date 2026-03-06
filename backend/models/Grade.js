const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const Grade = sequelize.define('Grade', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  grade_value: {
    type: DataTypes.DECIMAL
  },
  prelim_grade: {
    type: DataTypes.DECIMAL,
    allowNull: true
  },
  midterm_grade: {
    type: DataTypes.DECIMAL,
    allowNull: true
  },
  final_grade: {
    type: DataTypes.STRING,
    allowNull: true
  },
  term_taken: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'verified', 'rejected', 'passed', 'failed')
  },
  risk_status: {
    type: DataTypes.ENUM('pending', 'on_track', 'at_risk'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'grades',
  timestamps: false,
  hooks: {
    async afterSave(grade) {
      if (!grade || !grade.UserId) return;

      const finalGrade = String(grade.final_grade || '').trim().toUpperCase();
      const failedByFinalGrade = finalGrade === '5.00';
      const failedByStatus = String(grade.status || '').toLowerCase() === 'failed';

      if (!failedByFinalGrade && !failedByStatus) {
        const rawValue = grade.grade_value;
        if (rawValue === null || rawValue === undefined) return;

        const normalized = String(rawValue).trim().toUpperCase();
        const numeric = Number(normalized);
        const isFailing = (
          normalized === 'F' ||
          normalized === '5' ||
          normalized === '5.0' ||
          normalized === '5.00' ||
          (!Number.isNaN(numeric) && numeric >= 5)
        );

        if (!isFailing) return;
      }

      const StudyPlan = sequelize.models.StudyPlan;
      if (!StudyPlan) return;

      const approvedPlan = await StudyPlan.findOne({
        where: { UserId: grade.UserId, status: 'approved' },
        order: [['id', 'DESC']]
      });

      if (approvedPlan) {
        await approvedPlan.update({ status: 'voided_due_to_failure' });
      }
    }
  }
});

module.exports = Grade;
