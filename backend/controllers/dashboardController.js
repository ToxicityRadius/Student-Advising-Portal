const { Op, fn, col } = require('sequelize');
const {
  AcademicTerm,
  Course,
  CourseEquivalency,
  Curriculum,
  CurriculumCourse,
  ElectiveTrack,
  ElectiveTrackCourse,
  ForecastSnapshot,
  Prerequisite,
  PrerequisiteOverrideRequest,
  StudentAcademicRecord,
  StudyPlan,
  StudyPlanVersion,
  StudyPlanCourse,
  User,
} = require('../models');
const { computeSarAnalytics } = require('../utils/sarAnalytics');

const semesterLabel = {
  1: '1st Semester',
  2: '2nd Semester',
  3: 'Summer',
};

const getTermSummary = async () => {
  const currentTerm = await AcademicTerm.findOne({ where: { isCurrent: true } });
  if (!currentTerm) {
    return null;
  }

  return {
    id: currentTerm.id,
    schoolYear: currentTerm.schoolYear,
    semester: currentTerm.semester,
    semesterLabel: semesterLabel[currentTerm.semester] || `Semester ${currentTerm.semester}`,
    startedAt: currentTerm.startedAt,
    endedAt: currentTerm.endedAt,
  };
};

const buildStudentOwnershipWhere = (user) => {
  const ownershipChecks = [];

  if (user?.id) {
    ownershipChecks.push({ userId: user.id });
  }

  if (user?.email) {
    ownershipChecks.push({ email: String(user.email).trim().toLowerCase() });
  }

  if (user?.studentId) {
    ownershipChecks.push({ studentNumber: user.studentId });
  }

  return ownershipChecks.length > 0 ? { [Op.or]: ownershipChecks } : { id: null };
};

const buildAdviserSarWhere = (user) => {
  if (!user?.id) {
    return { id: null };
  }

  // Advisers share admin-level SAR visibility, so dashboard SAR summaries are global.
  return {};
};

const fetchStudyPlanVersions = async (studyPlanId) => {
  if (!studyPlanId) {
    return [];
  }

  return StudyPlanVersion.findAll({
    where: { studyPlanId },
    include: [
      {
        model: StudyPlanCourse,
        include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
      },
    ],
    order: [
      ['versionNumber', 'DESC'],
      ['createdAt', 'DESC'],
    ],
  });
};

const getSarAnalyticsPayload = async (sar) => {
  if (!sar) {
    return null;
  }

  const versions = await fetchStudyPlanVersions(sar.StudyPlan?.id);
  const plainVersions = versions.map((version) =>
    version.get ? version.get({ plain: true }) : version,
  );
  const activeStudyPlanVersion =
    plainVersions.find((version) => version.status === 'active') || null;

  const [
    curriculumCourses,
    prerequisites,
    currentTerm,
    electiveTrackCourses,
    allCurriculumTrackCourses,
    prerequisiteOverrides,
  ] = await Promise.all([
    CurriculumCourse.findAll({
      where: { curriculumId: sar.curriculumId },
      include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
      order: [
        ['yearLevel', 'ASC'],
        ['semester', 'ASC'],
        [Course, 'code', 'ASC'],
      ],
    }),
    Prerequisite.findAll({
      where: { curriculumId: sar.curriculumId },
      include: [{ model: Course, as: 'PrerequisiteCourse', attributes: ['id', 'code', 'name'] }],
    }),
    AcademicTerm.findOne({
      where: { isCurrent: true },
      attributes: ['id', 'schoolYear', 'semester'],
    }),
    sar.electiveTrackId
      ? ElectiveTrackCourse.findAll({
          where: { electiveTrackId: sar.electiveTrackId },
          include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
        })
      : [],
    ElectiveTrackCourse.findAll({
      include: [
        {
          model: ElectiveTrack,
          attributes: ['id', 'curriculumId'],
          where: { curriculumId: sar.curriculumId },
        },
        {
          model: Course,
          attributes: ['id', 'code', 'name', 'units'],
        },
      ],
    }),
    activeStudyPlanVersion?.id
      ? PrerequisiteOverrideRequest.findAll({
          where: { studyPlanVersionId: activeStudyPlanVersion.id, status: 'approved' },
        })
      : [],
  ]);

  return computeSarAnalytics({
    sar,
    studyPlanVersions: plainVersions,
    activeStudyPlanVersion,
    curriculumCourses,
    prerequisites,
    prerequisiteOverrides,
    currentTerm,
    electiveTrackCourses,
    allCurriculumTrackCourses,
  });
};

const buildStudentSummary = async (user) => {
  const sar = await StudentAcademicRecord.findOne({
    where: buildStudentOwnershipWhere(user),
    include: [
      { model: Curriculum, attributes: ['id', 'name'] },
      { model: StudyPlan, attributes: ['id'] },
    ],
    order: [
      ['updatedAt', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  if (!sar) {
    return {
      sarAvailable: false,
      sar: null,
    };
  }

  const plainSar = sar.get({ plain: true });
  const analytics = await getSarAnalyticsPayload(plainSar);
  const activeVersion = await StudyPlanVersion.findOne({
    where: { studyPlanId: plainSar.StudyPlan?.id || null, status: 'active' },
    order: [['versionNumber', 'DESC']],
  });

  return {
    sarAvailable: true,
    sar: {
      id: plainSar.id,
      studentNumber: plainSar.studentNumber,
      yearLevel: plainSar.yearLevel,
      curriculumName: plainSar.Curriculum?.name || null,
      activeVersionNumber: activeVersion?.versionNumber || null,
      kpis: {
        completionPercentage: Number(analytics?.progress?.completionPercentage || 0),
        completedUnits: analytics?.progress?.completedUnits ?? 0,
        totalUnits: analytics?.progress?.totalUnits ?? 0,
        remainingUnits: analytics?.progress?.remainingUnits ?? null,
        completedSubjects: analytics?.progress?.completedSubjects ?? 0,
        remainingSubjects: analytics?.progress?.remainingSubjects ?? 0,
        gwa: analytics?.gpaMonitoring?.gwa ?? null,
        prerequisiteRiskSubjects: Array.isArray(analytics?.prerequisiteChecking?.subjects)
          ? analytics.prerequisiteChecking.subjects.filter(
              (subject) => (subject.unmetPrerequisites || []).length > 0,
            ).length
          : 0,
      },
    },
  };
};

const buildAdviserSummary = async (user) => {
  const assignedSars = await StudentAcademicRecord.findAll({
    where: buildAdviserSarWhere(user),
    include: [
      { model: User, as: 'Student', attributes: ['id', 'adviserId'] },
      { model: Curriculum, attributes: ['id', 'name'] },
      { model: StudyPlan, attributes: ['id'] },
    ],
    order: [
      ['updatedAt', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  const studyPlanIds = assignedSars.map((sar) => sar.StudyPlan?.id).filter(Boolean);
  const versions =
    studyPlanIds.length > 0
      ? await StudyPlanVersion.findAll({
          where: { studyPlanId: { [Op.in]: studyPlanIds } },
          include: [
            {
              model: StudyPlanCourse,
              include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
            },
          ],
          order: [
            ['versionNumber', 'DESC'],
            ['createdAt', 'DESC'],
          ],
        })
      : [];

  const versionsByPlanId = versions.reduce((acc, version) => {
    const planId = String(version.studyPlanId);
    if (!acc[planId]) {
      acc[planId] = [];
    }
    acc[planId].push(version.get({ plain: true }));
    return acc;
  }, {});

  const curriculumIds = [...new Set(assignedSars.map((sar) => sar.curriculumId).filter(Boolean))];
  const [curriculumCourses, prerequisites, currentTerm] = await Promise.all([
    curriculumIds.length > 0
      ? CurriculumCourse.findAll({
          where: { curriculumId: { [Op.in]: curriculumIds } },
          include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
        })
      : [],
    curriculumIds.length > 0
      ? Prerequisite.findAll({
          where: { curriculumId: { [Op.in]: curriculumIds } },
          include: [
            { model: Course, as: 'PrerequisiteCourse', attributes: ['id', 'code', 'name'] },
          ],
        })
      : [],
    AcademicTerm.findOne({
      where: { isCurrent: true },
      attributes: ['id', 'schoolYear', 'semester'],
    }),
  ]);

  const coursesByCurriculum = curriculumCourses.reduce((acc, row) => {
    const key = String(row.curriculumId);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(row);
    return acc;
  }, {});

  const prereqByCurriculum = prerequisites.reduce((acc, row) => {
    const key = String(row.curriculumId);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(row);
    return acc;
  }, {});

  let studentsNeedingReview = 0;
  let prerequisiteRiskCount = 0;

  assignedSars.forEach((sar) => {
    const plainSar = sar.get({ plain: true });
    const planId = String(plainSar.StudyPlan?.id || '');
    const sarVersions = versionsByPlanId[planId] || [];

    const needsReview =
      sarVersions.some((version) => version.status === 'draft') ||
      sarVersions.some((version) => version.status === 'active' && version.needsRevalidation);

    if (needsReview) {
      studentsNeedingReview += 1;
    }

    const analytics = computeSarAnalytics({
      sar: plainSar,
      studyPlanVersions: sarVersions,
      activeStudyPlanVersion: sarVersions.find((version) => version.status === 'active') || null,
      curriculumCourses: coursesByCurriculum[String(plainSar.curriculumId)] || [],
      prerequisites: prereqByCurriculum[String(plainSar.curriculumId)] || [],
      currentTerm,
    });

    const hasRisk =
      Array.isArray(analytics?.prerequisiteChecking?.subjects) &&
      analytics.prerequisiteChecking.subjects.some(
        (subject) => (subject.unmetPrerequisites || []).length > 0,
      );

    if (hasRisk) {
      prerequisiteRiskCount += 1;
    }
  });

  return {
    assignedStudents: assignedSars.length,
    studentsNeedingReview,
    prerequisiteRiskCount,
    recentStudents: assignedSars.slice(0, 5).map((sar) => ({
      id: sar.id,
      studentName: sar.studentName,
      studentNumber: sar.studentNumber,
      curriculumName: sar.Curriculum?.name || null,
      yearLevel: sar.yearLevel,
    })),
  };
};

const buildAdminSummary = async () => {
  const [
    latestSnapshot,
    curriculums,
    courseCount,
    equivalencyCount,
    electiveTrackCount,
    adviserUsers,
    workloadRows,
    currentTerm,
    recentTerms,
  ] = await Promise.all([
    ForecastSnapshot.findOne({
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
    }),
    Curriculum.findAll({ attributes: ['id', 'name', 'isActive'] }),
    Course.count(),
    CourseEquivalency.count(),
    ElectiveTrack.count(),
    User.findAll({
      where: { role: 'adviser' },
      attributes: ['id', 'firstName', 'lastName', 'email'],
    }),
    StudentAcademicRecord.findAll({
      attributes: [
        'createdByAdviserId',
        [fn('COUNT', col('StudentAcademicRecord.id')), 'assignedCount'],
      ],
      where: { createdByAdviserId: { [Op.ne]: null } },
      group: ['createdByAdviserId'],
    }),
    AcademicTerm.findOne({
      where: { isCurrent: true },
      attributes: ['id', 'schoolYear', 'semester', 'startedAt'],
    }),
    AcademicTerm.findAll({
      attributes: ['id', 'schoolYear', 'semester', 'isCurrent'],
      order: [
        ['schoolYear', 'DESC'],
        ['semester', 'DESC'],
      ],
      limit: 3,
    }),
  ]);

  const workloadByAdviser = workloadRows.reduce((acc, row) => {
    acc[String(row.createdByAdviserId)] = Number(row.get('assignedCount') || 0);
    return acc;
  }, {});

  const adviserWorkload = adviserUsers
    .map((adviser) => ({
      id: adviser.id,
      name: [adviser.firstName, adviser.lastName].filter(Boolean).join(' ').trim() || adviser.email,
      email: adviser.email,
      assignedStudents: workloadByAdviser[String(adviser.id)] || 0,
    }))
    .sort((left, right) => right.assignedStudents - left.assignedStudents);

  return {
    forecastSnapshotPreview: latestSnapshot
      ? {
          id: latestSnapshot.id,
          schoolYear: latestSnapshot.schoolYear,
          semester: latestSnapshot.semester,
          semesterLabel:
            semesterLabel[latestSnapshot.semester] || `Semester ${latestSnapshot.semester}`,
          createdAt: latestSnapshot.createdAt,
          currentDemandCount: Array.isArray(latestSnapshot.snapshotData?.currentDemand)
            ? latestSnapshot.snapshotData.currentDemand.length
            : 0,
          nextSemesterForecastCount: Array.isArray(
            latestSnapshot.snapshotData?.nextSemesterForecast,
          )
            ? latestSnapshot.snapshotData.nextSemesterForecast.length
            : 0,
        }
      : null,
    curriculumHealth: {
      totalCurriculums: curriculums.length,
      activeCurriculumCount: curriculums.filter((curriculum) => curriculum.isActive).length,
      totalCourses: courseCount,
      totalEquivalencies: equivalencyCount,
      totalElectiveTracks: electiveTrackCount,
    },
    termManagement: {
      currentTerm: currentTerm
        ? {
            id: currentTerm.id,
            schoolYear: currentTerm.schoolYear,
            semester: currentTerm.semester,
            semesterLabel:
              semesterLabel[currentTerm.semester] || `Semester ${currentTerm.semester}`,
            startedAt: currentTerm.startedAt,
          }
        : null,
      recentTerms: recentTerms.map((term) => ({
        id: term.id,
        schoolYear: term.schoolYear,
        semester: term.semester,
        semesterLabel: semesterLabel[term.semester] || `Semester ${term.semester}`,
        isCurrent: term.isCurrent,
      })),
    },
    adviserWorkload,
  };
};

// @desc   Get role-specific dashboard summary
// @route  GET /api/dashboard/summary
// @access admin, adviser, student
exports.getDashboardSummary = async (req, res, next) => {
  try {
    const currentTerm = await getTermSummary();

    if (req.user.role === 'student') {
      const studentSummary = await buildStudentSummary(req.user);
      return res
        .status(200)
        .json({ success: true, data: { role: 'student', currentTerm, ...studentSummary } });
    }

    if (req.user.role === 'adviser') {
      const adviserSummary = await buildAdviserSummary(req.user);
      return res
        .status(200)
        .json({ success: true, data: { role: 'adviser', currentTerm, ...adviserSummary } });
    }

    const adminSummary = await buildAdminSummary();
    return res
      .status(200)
      .json({ success: true, data: { role: 'admin', currentTerm, ...adminSummary } });
  } catch (error) {
    next(error);
  }
};

// @desc   Student-specific dashboard for legacy pages (Checklist, ViewGrades, AvailableSubjects, PlanOfStudy)
// @route  GET /api/users/me/dashboard
// @access student
exports.getStudentDashboard = async (req, res, next) => {
  try {
    const sar = await StudentAcademicRecord.findOne({
      where: buildStudentOwnershipWhere(req.user),
      include: [
        { model: Curriculum, attributes: ['id', 'name'] },
        { model: StudyPlan, attributes: ['id'] },
      ],
      order: [
        ['updatedAt', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    if (!sar) {
      return res.status(200).json({
        success: true,
        data: {
          sarId: null,
          gwa: null,
          unitsCredited: 0,
          totalUnits: 0,
          subjectsCompleted: 0,
          subjectsPending: 0,
          semesterSummary: [],
          adviserReviewWorkflow: null,
        },
      });
    }

    const plainSar = sar.get({ plain: true });
    const analytics = await getSarAnalyticsPayload(plainSar);

    if (!analytics) {
      return res.status(200).json({
        success: true,
        data: {
          sarId: plainSar.id,
          gwa: null,
          unitsCredited: 0,
          totalUnits: 0,
          subjectsCompleted: 0,
          subjectsPending: 0,
          semesterSummary: [],
          adviserReviewWorkflow: null,
        },
      });
    }

    // Group subjects by year/semester for the semesterSummary
    const groupMap = new Map();
    (analytics.curriculumChecklistOverview?.items || []).forEach((subject) => {
      const key = `${subject.yearLevel}-${subject.semester}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          yearLevel: subject.yearLevel,
          semester: subject.semester,
          courses: [],
        });
      }
      groupMap.get(key).courses.push({
        code: subject.code,
        name: subject.name,
        units: subject.units,
        status: subject.status,
        grade: subject.grade,
        isEligible: subject.isEligible,
        isPrerequisiteMet: subject.isPrerequisiteMet,
        unmetPrerequisites: subject.unmetPrerequisites || [],
      });
    });

    const semesterSummary = Array.from(groupMap.values()).sort((a, b) =>
      a.yearLevel !== b.yearLevel ? a.yearLevel - b.yearLevel : a.semester - b.semester,
    );

    return res.status(200).json({
      success: true,
      data: {
        sarId: plainSar.id,
        gwa: analytics.gpaMonitoring?.gwa ?? null,
        unitsCredited: analytics.progress?.completedUnits ?? 0,
        totalUnits: analytics.progress?.totalUnits ?? 0,
        subjectsCompleted: analytics.progress?.completedSubjects ?? 0,
        subjectsPending: analytics.progress?.remainingSubjects ?? 0,
        semesterSummary,
        adviserReviewWorkflow: analytics.adviserReviewWorkflow || null,
      },
    });
  } catch (error) {
    next(error);
  }
};
