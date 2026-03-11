const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const ElectiveTrackCourse = sequelize.define('ElectiveTrackCourse', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  electiveTrackId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'elective_tracks', key: 'id' }
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'courses', key: 'id' }
  },
  yearLevel: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  semester: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'elective_track_courses',
  timestamps: false
});

module.exports = ElectiveTrackCourse;
