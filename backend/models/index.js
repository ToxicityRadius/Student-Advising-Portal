const sequelize = require('../database/db');
const User = require('./User');
const Invitation = require('./Invitation');
const Curriculum = require('./Curriculum');
const Subject = require('./Subject');
const Prerequisite = require('./Prerequisite');
const EquivalencyRule = require('./EquivalencyRule');
const Grade = require('./Grade');
const ProofDocument = require('./ProofDocument');
const StudyPlan = require('./StudyPlan');
const PlanSubject = require('./PlanSubject');

// Define ALL associations globally
Curriculum.hasMany(Subject);
Subject.belongsTo(Curriculum);

User.hasMany(Grade);
Grade.belongsTo(User);

Subject.hasMany(Grade);
Grade.belongsTo(Subject);

Grade.hasOne(ProofDocument);
ProofDocument.belongsTo(Grade);

User.hasMany(StudyPlan);
StudyPlan.belongsTo(User);

StudyPlan.hasMany(PlanSubject);
PlanSubject.belongsTo(StudyPlan);

Subject.hasMany(PlanSubject);
PlanSubject.belongsTo(Subject);

module.exports = {
  sequelize, User, Invitation, Curriculum, Subject, Prerequisite,
  EquivalencyRule, Grade, ProofDocument, StudyPlan, PlanSubject
};
