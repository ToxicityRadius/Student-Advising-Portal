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
const AcademicTerm = require('./AcademicTerm');
const OpenedSection = require('./OpenedSection');
const CourseOffering = require('./CourseOffering');

// Define ALL associations globally
Curriculum.hasMany(Subject);
Subject.belongsTo(Curriculum);

Curriculum.hasMany(User);
User.belongsTo(Curriculum);

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

// Prerequisite associations
Subject.hasMany(Prerequisite, { foreignKey: 'subject_id', as: 'prerequisites' });
Prerequisite.belongsTo(Subject, { as: 'RequiredSubject', foreignKey: 'required_subj_id' });

// Equivalency associations
Subject.hasMany(EquivalencyRule, { foreignKey: 'source_subject_id', as: 'equivalencies' });
EquivalencyRule.belongsTo(Subject, { as: 'TargetSubject', foreignKey: 'target_subject_id' });

// OpenedSection associations
Subject.hasMany(OpenedSection);
OpenedSection.belongsTo(Subject);

// CourseOffering associations
Subject.hasMany(CourseOffering);
CourseOffering.belongsTo(Subject);

// Adviser caseload associations (self-referential)
User.hasMany(User, { as: 'Advisees', foreignKey: 'adviserId' });
User.belongsTo(User, { as: 'Adviser', foreignKey: 'adviserId' });

module.exports = {
  sequelize, User, Invitation, Curriculum, Subject, Prerequisite,
  EquivalencyRule, Grade, ProofDocument, StudyPlan, PlanSubject, AcademicTerm,
  OpenedSection, CourseOffering
};
