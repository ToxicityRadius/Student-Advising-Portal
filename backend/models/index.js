const sequelize = require('../database/db');
const User = require('./User');
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
Curriculum.hasMany(Subject, { constraints: false });
Subject.belongsTo(Curriculum, { constraints: false });

Curriculum.hasMany(User, { constraints: false });
User.belongsTo(Curriculum, { constraints: false });

User.hasMany(Grade, { constraints: false });
Grade.belongsTo(User, { constraints: false });

Subject.hasMany(Grade, { constraints: false });
Grade.belongsTo(Subject, { constraints: false });

Grade.hasOne(ProofDocument, { constraints: false });
ProofDocument.belongsTo(Grade, { constraints: false });

User.hasMany(StudyPlan, { as: 'StudyPlans', foreignKey: 'UserId', constraints: false });
StudyPlan.belongsTo(User, { as: 'Student', foreignKey: 'UserId', constraints: false });

StudyPlan.hasMany(PlanSubject, { constraints: false });
PlanSubject.belongsTo(StudyPlan, { constraints: false });

Subject.hasMany(PlanSubject, { constraints: false });
PlanSubject.belongsTo(Subject, { constraints: false });

// Prerequisite associations
Subject.hasMany(Prerequisite, { foreignKey: 'subject_id', as: 'prerequisites', constraints: false });
Prerequisite.belongsTo(Subject, { as: 'RequiredSubject', foreignKey: 'required_subj_id', constraints: false });

// Equivalency associations
Subject.hasMany(EquivalencyRule, { foreignKey: 'source_subject_id', as: 'equivalencies', constraints: false });
EquivalencyRule.belongsTo(Subject, { as: 'TargetSubject', foreignKey: 'target_subject_id', constraints: false });

// OpenedSection associations
Subject.hasMany(OpenedSection, { constraints: false });
OpenedSection.belongsTo(Subject, { constraints: false });

// CourseOffering associations
Subject.hasMany(CourseOffering, { constraints: false });
CourseOffering.belongsTo(Subject, { constraints: false });

// Adviser caseload associations (self-referential)
User.hasMany(User, { as: 'Advisees', foreignKey: 'adviserId', constraints: false });
User.belongsTo(User, { as: 'Adviser', foreignKey: 'adviserId', constraints: false });

module.exports = {
  sequelize, User, Curriculum, Subject, Prerequisite,
  EquivalencyRule, Grade, ProofDocument, StudyPlan, PlanSubject, AcademicTerm,
  OpenedSection, CourseOffering
};
