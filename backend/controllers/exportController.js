const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const {
  StudentAcademicRecord,
  StudyPlan,
  StudyPlanVersion,
  StudyPlanCourse,
  Curriculum,
  CurriculumCourse,
  Prerequisite,
  AcademicTerm,
  Course,
  ElectiveTrack,
  User,
} = require('../models');
const { computeSarAnalytics } = require('../utils/sarAnalytics');

const normalizeEmail = (email) =>
  String(email || '')
    .trim()
    .toLowerCase();

const isSarOwnedByUser = (sar, user) => {
  if (!sar || !user) {
    return false;
  }

  const sarEmail = normalizeEmail(sar.email);
  const userEmail = normalizeEmail(user.email);

  return (
    String(sar.userId || '') === String(user.id || '') ||
    (sarEmail && userEmail && sarEmail === userEmail) ||
    (sar.studentNumber && user.studentId && String(sar.studentNumber) === String(user.studentId))
  );
};

const formatTimestamp = (value) => {
  if (!value) {
    return 'N/A';
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return 'N/A';
  }

  return new Date(parsed).toLocaleString();
};

const semesterLabel = (semester) => {
  if (Number(semester) === 1) return '1st Semester';
  if (Number(semester) === 2) return '2nd Semester';
  if (Number(semester) === 3) return 'Summer';
  return `Semester ${semester}`;
};

const PAGE_PADDING_BOTTOM = 24;

// ─── Brand Colors ─────────────────────────────────────────────────────────────
const BRAND = {
  gold: '#D4A017',
  goldLight: '#FDF6E3',
  goldBorder: '#E8C547',
  dark: '#1A1A1A',
  muted: '#555555',
  subtle: '#888888',
  tableBorder: '#D6D6D6',
  tableStripe: '#FAFAF8',
  tableHeaderBg: '#F5F1E8',
  groupBg: '#1A1A1A',
  groupText: '#FFFFFF',
  sectionAccent: '#D4A017',
  cardBg: '#FDFCF9',
  cardBorder: '#E2DDCF',
  tagBg: '#FDF6E3',
  tagBorder: '#E8C547',
  failBg: '#FFF1F0',
  failBorder: '#FFCCC7',
};

const ensureSpace = (doc, minHeight = 40) => {
  const maxY = doc.page.height - doc.page.margins.bottom;
  if (doc.y + minHeight > maxY) {
    doc.addPage();
    doc.x = doc.page.margins.left;
    doc.y = doc.page.margins.top;
  }
};

const drawSectionTitle = (doc, title, subtitle = '') => {
  doc.x = doc.page.margins.left;
  ensureSpace(doc, 36);
  doc.moveDown(0.7);

  // Gold accent bar
  const barY = doc.y;
  doc.save();
  doc.rect(doc.page.margins.left, barY, 3, subtitle ? 28 : 16).fill(BRAND.sectionAccent);
  doc.restore();

  doc
    .fontSize(11.5)
    .font('Helvetica-Bold')
    .fillColor(BRAND.dark)
    .text(title, doc.page.margins.left + 10);
  if (subtitle) {
    doc.moveDown(0.05);
    doc
      .fontSize(8.5)
      .font('Helvetica')
      .fillColor(BRAND.muted)
      .text(subtitle, doc.page.margins.left + 10);
  }
  doc.moveDown(0.3);
  const lineY = doc.y;
  doc
    .moveTo(doc.page.margins.left, lineY)
    .lineTo(doc.page.width - doc.page.margins.right, lineY)
    .lineWidth(0.5)
    .strokeColor(BRAND.tableBorder)
    .stroke();
  doc.moveDown(0.5);
  doc.x = doc.page.margins.left;
  doc.fillColor(BRAND.dark).fontSize(9.5).font('Helvetica');
};

const drawTag = (doc, text, options = {}) => {
  const tagText = String(text || 'N/A');
  const x = options.x ?? doc.x;
  const y = options.y ?? doc.y;
  const paddingX = 7;
  const paddingY = 3;
  const width = doc.widthOfString(tagText, { font: 'Helvetica-Bold', size: 8 }) + paddingX * 2;
  const height = 16;

  doc.save();
  doc
    .roundedRect(x, y, width, height, 3)
    .fillAndStroke(options.background || BRAND.tagBg, options.border || BRAND.tagBorder);
  doc
    .fillColor(options.color || BRAND.dark)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text(tagText, x + paddingX, y + paddingY + 0.5, {
      width: width - paddingX * 2,
      align: 'center',
    });
  doc.restore();

  return { width, height };
};

const drawKpiCards = (doc, cards) => {
  if (!Array.isArray(cards) || cards.length === 0) {
    return;
  }

  ensureSpace(doc, 78);
  const gap = 10;
  const totalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const cardWidth = (totalWidth - gap * (cards.length - 1)) / cards.length;
  const startX = doc.page.margins.left;
  const startY = doc.y;
  const cardHeight = 58;

  cards.forEach((card, index) => {
    const x = startX + index * (cardWidth + gap);
    doc.save();
    doc
      .roundedRect(x, startY, cardWidth, cardHeight, 5)
      .fillAndStroke(BRAND.cardBg, BRAND.cardBorder);
    // Gold top accent stripe
    doc.rect(x + 1, startY + 1, cardWidth - 2, 2.5).fill(BRAND.gold);
    doc
      .fillColor(BRAND.subtle)
      .font('Helvetica')
      .fontSize(8)
      .text((card.label || 'Metric').toUpperCase(), x + 10, startY + 10, {
        width: cardWidth - 20,
        characterSpacing: 0.4,
      });
    doc
      .fillColor(BRAND.dark)
      .font('Helvetica-Bold')
      .fontSize(15)
      .text(card.value || 'N/A', x + 10, startY + 24, {
        width: cardWidth - 20,
      });
    if (card.hint) {
      doc
        .fillColor(BRAND.muted)
        .font('Helvetica')
        .fontSize(7.5)
        .text(card.hint, x + 10, startY + 43, {
          width: cardWidth - 20,
        });
    }
    doc.restore();
  });

  doc.y = startY + cardHeight + 8;
};

const drawKeyValueGrid = (doc, rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  const leftX = doc.page.margins.left;
  const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columnGap = 16;
  const columnWidth = (availableWidth - columnGap) / 2;

  for (let index = 0; index < rows.length; index += 2) {
    const leftItem = rows[index];
    const rightItem = rows[index + 1] || null;

    ensureSpace(doc, 30);
    const rowY = doc.y;
    const leftHeight = drawKeyValueItem(doc, leftX, rowY, columnWidth, leftItem);
    const rightHeight = rightItem
      ? drawKeyValueItem(doc, leftX + columnWidth + columnGap, rowY, columnWidth, rightItem)
      : 0;

    doc.y = rowY + Math.max(leftHeight, rightHeight, 24) + 2;
  }
};

const drawKeyValueItem = (doc, x, y, width, item) => {
  const label = item?.label || 'Field';
  const value = item?.value || 'N/A';

  doc.font('Helvetica-Bold').fontSize(7.8).fillColor(BRAND.subtle).text(label.toUpperCase(), x, y, {
    width,
    characterSpacing: 0.3,
  });

  const valueY = y + 11;
  doc.font('Helvetica').fontSize(9.5).fillColor(BRAND.dark).text(value, x, valueY, {
    width,
    lineGap: 1,
  });

  const valueHeight = doc.heightOfString(value, {
    width,
    lineGap: 1,
  });

  return valueHeight + 14;
};

const resolveUploadPathFromPublicPath = (publicPath) => {
  if (!publicPath || !String(publicPath).startsWith('/uploads/')) {
    return null;
  }

  const normalized = String(publicPath).replace(/\\/g, '/');
  const relative = normalized.replace(/^\/uploads\//, '');
  const uploadsRoot = path.resolve(__dirname, '../uploads');
  const resolved = path.resolve(uploadsRoot, relative);

  // Prevent path traversal: reject any path that escapes the uploads directory
  if (!resolved.startsWith(uploadsRoot + path.sep) && resolved !== uploadsRoot) {
    return null;
  }

  return resolved;
};

const PRIVATE_IP_PATTERN = /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.)/;
const MAX_REMOTE_IMAGE_BYTES = 5 * 1024 * 1024;
const REMOTE_IMAGE_TIMEOUT_MS = 5000;

const downloadImageBuffer = (url) =>
  new Promise((resolve, reject) => {
    // Only allow HTTPS to prevent cleartext transmission and SSRF via redirects
    if (!url.startsWith('https://')) {
      return reject(new Error('Only HTTPS image URLs are permitted'));
    }

    let hostname;
    try {
      hostname = new URL(url).hostname;
    } catch {
      return reject(new Error('Invalid image URL'));
    }

    // Block SSRF against localhost and private/internal network addresses
    if (hostname === 'localhost' || PRIVATE_IP_PATTERN.test(hostname)) {
      return reject(new Error('Image URL targets a blocked address'));
    }

    const request = https.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        response.resume();
        reject(new Error(`Image request failed with status ${response.statusCode}`));
        return;
      }

      const contentLength = parseInt(response.headers['content-length'] || '0', 10);
      if (contentLength > MAX_REMOTE_IMAGE_BYTES) {
        response.resume();
        reject(new Error('Remote image exceeds maximum allowed size'));
        return;
      }

      const chunks = [];
      let totalBytes = 0;
      response.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_REMOTE_IMAGE_BYTES) {
          response.destroy();
          reject(new Error('Remote image exceeds maximum allowed size'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve(Buffer.concat(chunks)));
    });

    request.setTimeout(REMOTE_IMAGE_TIMEOUT_MS, () => {
      request.destroy();
      reject(new Error('Image download timed out'));
    });
    request.on('error', reject);
  });

const drawProfilePhoto = async (doc, profilePicturePath) => {
  const photoSize = 72;
  const drawX = doc.page.width - doc.page.margins.right - photoSize;
  const drawY = 45;
  const localImagePath = resolveUploadPathFromPublicPath(profilePicturePath);

  if (localImagePath && fs.existsSync(localImagePath)) {
    try {
      doc.image(localImagePath, drawX, drawY, {
        fit: [photoSize, photoSize],
        align: 'center',
        valign: 'center',
      });
    } catch {
      // Skip photo rendering if PDFKit cannot parse the image.
    }

    return;
  }

  // Only attempt remote fetch for HTTPS URLs (http:// is also blocked inside downloadImageBuffer)
  if (!/^https:\/\//i.test(String(profilePicturePath || ''))) {
    return;
  }

  try {
    const remoteBuffer = await downloadImageBuffer(profilePicturePath);
    doc.image(remoteBuffer, drawX, drawY, {
      fit: [photoSize, photoSize],
      align: 'center',
      valign: 'center',
    });
  } catch {
    // Skip photo rendering if remote image cannot be downloaded or parsed.
  }
};

const drawTableHeader = (doc, columns, y) => {
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.save();
  doc.rect(doc.page.margins.left, y, tableWidth, 18).fill(BRAND.tableHeaderBg);
  doc
    .moveTo(doc.page.margins.left, y + 18)
    .lineTo(doc.page.margins.left + tableWidth, y + 18)
    .lineWidth(0.8)
    .strokeColor(BRAND.gold)
    .stroke();

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(BRAND.muted);
  columns.forEach((column) => {
    doc.text(column.label.toUpperCase(), column.x, y + 5.5, {
      width: column.width,
      align: column.align || 'left',
      characterSpacing: 0.5,
    });
  });
  doc.restore();
};

const drawStudyPlanRows = (doc, courses) => {
  if (!Array.isArray(courses) || courses.length === 0) {
    doc
      .fontSize(9.5)
      .font('Helvetica')
      .fillColor(BRAND.muted)
      .text('No courses found in the active study plan version.');
    return;
  }

  // Filter out courses that already have grades (only show remaining/pending courses)
  const isGraded = (course) => {
    const grade = String(course.grade || '')
      .trim()
      .toLowerCase();
    const status = String(course.status || '')
      .trim()
      .toLowerCase();
    return grade && grade !== 'pending' && grade !== 'n/a' && grade !== '' && status !== 'pending';
  };

  const pendingCourses = courses.filter((c) => !isGraded(c));
  const gradedCount = courses.length - pendingCourses.length;

  if (pendingCourses.length === 0) {
    doc
      .fontSize(9.5)
      .font('Helvetica')
      .fillColor(BRAND.muted)
      .text('All courses in the study plan have been graded.');
    if (gradedCount > 0) {
      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor(BRAND.subtle)
        .text(
          `${gradedCount} course${gradedCount !== 1 ? 's' : ''} with grades excluded from this view.`,
        );
    }
    return;
  }

  if (gradedCount > 0) {
    doc
      .fontSize(8.5)
      .font('Helvetica')
      .fillColor(BRAND.subtle)
      .text(
        `${gradedCount} course${gradedCount !== 1 ? 's' : ''} with existing grades excluded. Showing ${pendingCourses.length} remaining.`,
      );
    doc.moveDown(0.3);
  }

  const sortedCourses = [...pendingCourses].sort((left, right) => {
    if (Number(left.yearLevel) !== Number(right.yearLevel)) {
      return Number(left.yearLevel) - Number(right.yearLevel);
    }

    if (Number(left.semester) !== Number(right.semester)) {
      return Number(left.semester) - Number(right.semester);
    }

    return String(left.Course?.code || '').localeCompare(String(right.Course?.code || ''));
  });

  const tableX = doc.page.margins.left;
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const fixedColumnsWidth = 82 + 44 + 74;
  const courseNameWidth = Math.max(180, tableWidth - fixedColumnsWidth);
  const columns = [
    { key: 'code', label: 'Code', width: 82, align: 'left' },
    { key: 'name', label: 'Course Name', width: courseNameWidth, align: 'left' },
    { key: 'units', label: 'Units', width: 44, align: 'right' },
    { key: 'status', label: 'Status', width: 74, align: 'right' },
  ];

  let cursorX = tableX;
  columns.forEach((column) => {
    column.x = cursorX;
    cursorX += column.width;
  });

  const groupedCourses = sortedCourses.reduce((acc, course) => {
    const groupKey = `${Number(course.yearLevel)}-${Number(course.semester)}`;
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(course);
    return acc;
  }, {});

  const sortedGroupKeys = Object.keys(groupedCourses).sort((left, right) => {
    const [leftYear, leftSemester] = left.split('-').map(Number);
    const [rightYear, rightSemester] = right.split('-').map(Number);
    if (leftYear !== rightYear) {
      return leftYear - rightYear;
    }
    return leftSemester - rightSemester;
  });

  const drawGroupHeader = (y, groupLabel, groupUnits, isContinued = false) => {
    const label = isContinued ? `${groupLabel} (continued)` : groupLabel;
    doc.save();
    doc.rect(tableX, y, tableWidth, 18).fill(BRAND.groupBg);
    // Gold left accent strip on group header
    doc.rect(tableX, y, 3, 18).fill(BRAND.gold);
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(BRAND.groupText)
      .text(label, tableX + 10, y + 4.5, {
        width: tableWidth - 20,
        align: 'left',
      });
    if (!isContinued && groupUnits > 0) {
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#CCCCCC')
        .text(`${groupUnits} units`, tableX + 10, y + 4.5, {
          width: tableWidth - 20,
          align: 'right',
        });
    }
    doc.restore();
  };

  ensureSpace(doc, 44);
  let currentY = doc.y;

  sortedGroupKeys.forEach((groupKey) => {
    const [yearLevel, semester] = groupKey.split('-').map(Number);
    const groupLabel = `Year ${yearLevel} — ${semesterLabel(semester)}`;
    const groupItems = groupedCourses[groupKey] || [];
    const groupUnits = groupItems.reduce((sum, c) => sum + (Number(c.Course?.units) || 0), 0);

    ensureSpace(doc, 44);
    currentY = doc.y;
    drawGroupHeader(currentY, groupLabel, groupUnits);
    currentY += 22;
    drawTableHeader(doc, columns, currentY);
    currentY += 22;

    groupItems.forEach((course, rowIndex) => {
      const rowValues = {
        code: String(course.Course?.code || 'N/A'),
        name: String(course.Course?.name || 'N/A'),
        units: String(course.Course?.units ?? ''),
        status: String((course.status || 'pending').toUpperCase()),
      };

      const nameHeight = doc.heightOfString(rowValues.name, {
        width: columns[1].width,
        lineGap: 1,
      });
      const rowHeight = Math.max(18, nameHeight + 6);

      if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom - PAGE_PADDING_BOTTOM) {
        doc.addPage();
        currentY = doc.page.margins.top;
        drawGroupHeader(currentY, groupLabel, groupUnits, true);
        currentY += 22;
        drawTableHeader(doc, columns, currentY);
        currentY += 22;
      }

      const rowY = currentY;
      const isFailStatus = String(course.status || '').toLowerCase() === 'failed';

      doc.save();
      if (isFailStatus) {
        doc.rect(tableX, rowY - 1, tableWidth, rowHeight).fill(BRAND.failBg);
        doc
          .moveTo(tableX, rowY - 1)
          .lineTo(tableX, rowY - 1 + rowHeight)
          .lineWidth(2)
          .strokeColor(BRAND.failBorder)
          .stroke();
      } else if (rowIndex % 2 === 1) {
        doc.rect(tableX, rowY - 1, tableWidth, rowHeight).fill(BRAND.tableStripe);
      }
      doc.restore();

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BRAND.dark);
      doc.text(rowValues.code, columns[0].x, rowY + 3, {
        width: columns[0].width,
        align: columns[0].align,
        lineBreak: false,
      });
      doc.font('Helvetica').fontSize(8.5).fillColor(BRAND.dark);
      doc.text(rowValues.name, columns[1].x, rowY + 3, {
        width: columns[1].width,
        align: columns[1].align,
        lineGap: 1,
      });
      doc.font('Helvetica').fontSize(8.5).fillColor(BRAND.muted);
      doc.text(rowValues.units, columns[2].x, rowY + 3, {
        width: columns[2].width,
        align: columns[2].align,
        lineBreak: false,
      });
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(isFailStatus ? '#CF1322' : BRAND.subtle);
      doc.text(rowValues.status, columns[3].x, rowY + 3, {
        width: columns[3].width,
        align: columns[3].align,
        lineBreak: false,
      });

      doc.save();
      doc
        .moveTo(tableX, rowY + rowHeight)
        .lineTo(tableX + tableWidth, rowY + rowHeight)
        .lineWidth(0.3)
        .strokeColor(BRAND.tableBorder)
        .stroke();
      doc.restore();

      currentY += rowHeight;
    });

    // Semester subtotal row
    doc.save();
    doc.rect(tableX, currentY, tableWidth, 16).fill(BRAND.tableHeaderBg);
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(BRAND.muted)
      .text(`${groupItems.length} courses · ${groupUnits} units`, tableX + 8, currentY + 4, {
        width: tableWidth - 16,
        align: 'right',
      });
    doc.restore();
    currentY += 20;

    doc.y = currentY + 4;
  });

  doc.x = doc.page.margins.left;
  doc.y = Math.max(doc.y, currentY + 2);
};

const drawPrerequisiteHighlights = (doc, analytics) => {
  const unmetSubjects = Array.isArray(analytics?.prerequisiteChecking?.subjects)
    ? analytics.prerequisiteChecking.subjects.filter(
        (subject) =>
          Array.isArray(subject.unmetPrerequisites) && subject.unmetPrerequisites.length > 0,
      )
    : [];

  const total = Array.isArray(analytics?.prerequisiteChecking?.subjects)
    ? analytics.prerequisiteChecking.subjects.length
    : 0;

  const met =
    analytics?.prerequisiteChecking?.metSubjects ?? Math.max(total - unmetSubjects.length, 0);

  drawKeyValueGrid(doc, [
    { label: 'Prerequisite Coverage', value: `${met} met / ${total} evaluated` },
    { label: 'Subjects With Unmet Prerequisites', value: String(unmetSubjects.length) },
  ]);

  if (unmetSubjects.length === 0) {
    doc.moveDown(0.1);
    doc
      .font('Helvetica')
      .fontSize(9.2)
      .fillColor('#2D6A4F')
      .text('No unmet prerequisite risks detected in the current active plan.');
    return;
  }

  doc.moveDown(0.2);
  doc
    .font('Helvetica-Bold')
    .fontSize(9.3)
    .fillColor(BRAND.dark)
    .text('Top prerequisite risk subjects');
  doc.moveDown(0.2);

  unmetSubjects.slice(0, 8).forEach((subject) => {
    ensureSpace(doc, 24);
    const unmetCodes = subject.unmetPrerequisites
      .map((item) => item.prerequisiteCode)
      .filter(Boolean)
      .join(', ');

    doc
      .font('Helvetica-Bold')
      .fontSize(8.9)
      .fillColor(BRAND.dark)
      .text(`${subject.courseCode || 'N/A'} — ${subject.courseName || 'Untitled Subject'}`);
    doc
      .font('Helvetica')
      .fontSize(8.7)
      .fillColor(BRAND.muted)
      .text(`Unmet prerequisites: ${unmetCodes || 'N/A'}`);
    doc.moveDown(0.2);
  });
};

const formatVersionMetadata = (activeVersion) => {
  if (!activeVersion) {
    return 'No active version';
  }

  return `Version ${activeVersion.versionNumber || 'N/A'} · ${String(activeVersion.status || 'unknown').toUpperCase()}`;
};

// @desc   Export SAR to PDF
// @route  GET /api/sars/:id/export/pdf
// @access student (own only), adviser, admin
exports.exportSARPDF = async (req, res, next) => {
  try {
    const sar = await StudentAcademicRecord.findByPk(req.params.id, {
      include: [
        { model: Curriculum, attributes: ['id', 'name'] },
        { model: ElectiveTrack, attributes: ['id', 'name'] },
        { model: User, as: 'Student', attributes: ['id', 'profile_picture'] },
        {
          model: User,
          as: 'CreatedByAdviser',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: StudyPlan,
          attributes: ['id'],
          include: [
            {
              model: StudyPlanVersion,
              where: { status: 'active' },
              required: false,
              include: [
                {
                  model: User,
                  as: 'ValidatedByAdviser',
                  attributes: ['id', 'firstName', 'lastName', 'email'],
                },
                {
                  model: StudyPlanCourse,
                  include: [{ model: Course, attributes: ['id', 'code', 'name', 'units'] }],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!sar) {
      return res.status(404).json({ success: false, message: 'Student academic record not found' });
    }

    if (req.user.role === 'student' && !isSarOwnedByUser(sar, req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const activeVersion = Array.isArray(sar.StudyPlan?.StudyPlanVersions)
      ? sar.StudyPlan.StudyPlanVersions[0] || null
      : null;

    if (req.user.role === 'student' && !activeVersion?.validatedAt) {
      return res.status(403).json({
        success: false,
        message: 'Study plan PDF can only be exported after adviser validation.',
      });
    }

    const allVersions = sar.StudyPlan?.id
      ? await StudyPlanVersion.findAll({
          where: { studyPlanId: sar.StudyPlan.id },
          include: [
            {
              model: User,
              as: 'GeneratedByAdviser',
              attributes: ['id', 'firstName', 'lastName', 'email'],
            },
            {
              model: User,
              as: 'ValidatedByAdviser',
              attributes: ['id', 'firstName', 'lastName', 'email'],
            },
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

    const [curriculumCourses, prerequisites, currentTerm] = await Promise.all([
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
    ]);

    const analytics = computeSarAnalytics({
      sar,
      studyPlanVersions: allVersions,
      activeStudyPlanVersion: activeVersion,
      curriculumCourses,
      prerequisites,
      currentTerm,
    });

    const validatingAdviserName = activeVersion?.ValidatedByAdviser
      ? `${activeVersion.ValidatedByAdviser.firstName} ${activeVersion.ValidatedByAdviser.lastName}`
      : 'N/A';

    const filenameSafeStudentNumber = String(sar.studentNumber || 'unknown').replace(
      /[^a-z0-9-_]/gi,
      '_',
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="SAR-${filenameSafeStudentNumber}.pdf"`,
    );

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    await drawProfilePhoto(doc, sar.Student?.profile_picture);

    // Gold accent bar at top of page
    doc.save();
    doc
      .rect(
        doc.page.margins.left,
        doc.page.margins.top - 10,
        doc.page.width - doc.page.margins.left - doc.page.margins.right,
        4,
      )
      .fill(BRAND.gold);
    doc.restore();
    doc.y = doc.page.margins.top + 2;

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor(BRAND.dark)
      .text('Technological Institute of the Philippines', {
        align: 'center',
      });
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(BRAND.muted)
      .text('Student Academic Record Summary Report', {
        align: 'center',
        characterSpacing: 0.6,
      });
    doc.moveDown(0.3);

    const tagStartX = doc.page.margins.left;
    const tagY = doc.y;
    const roleTag = drawTag(
      doc,
      req.user.role === 'admin' ? 'Program Chair Access' : `${req.user.role} Access`,
      {
        x: tagStartX,
        y: tagY,
        background: BRAND.goldLight,
        border: BRAND.goldBorder,
      },
    );
    const versionTag = drawTag(doc, formatVersionMetadata(activeVersion), {
      x: tagStartX + roleTag.width + 8,
      y: tagY,
      background: '#F0F4F8',
      border: '#CBD5E0',
    });
    drawTag(doc, `Generated ${new Date().toLocaleString()}`, {
      x: tagStartX + roleTag.width + versionTag.width + 16,
      y: tagY,
      background: '#F7F7F5',
      border: '#E0DED8',
    });

    doc.y = tagY + 20;

    drawSectionTitle(doc, 'Student Profile', 'Identity and account-linked record information');
    drawKeyValueGrid(doc, [
      { label: 'Full Name', value: sar.studentName },
      { label: 'Student Number', value: sar.studentNumber },
      { label: 'Email', value: sar.email },
      { label: 'Year Level', value: `Year ${sar.yearLevel || 'N/A'}` },
      { label: 'Curriculum', value: sar.Curriculum?.name || 'N/A' },
      { label: 'Elective Track', value: sar.ElectiveTrack?.name || 'Not selected' },
    ]);

    drawSectionTitle(doc, 'Progress Snapshot', 'Core completion and performance indicators');
    drawKpiCards(doc, [
      {
        label: 'Completion',
        value: `${Number(analytics.progress?.completionPercentage || 0).toFixed(2)}%`,
        hint: analytics.progress?.unitsCompletedVsTotal || 'Units summary unavailable',
      },
      {
        label: 'Remaining Units',
        value: String(analytics.progress?.remainingUnits ?? 'N/A'),
        hint: `Remaining semesters: ${analytics.remainingSemestersTracking?.estimatedRemainingSemesters ?? 'N/A'}`,
      },
      {
        label: 'Current GWA',
        value: analytics.gpaMonitoring?.gwa != null ? String(analytics.gpaMonitoring.gwa) : 'N/A',
        hint: `${analytics.subjectsTakenSummary?.passed ?? 0} passed / ${analytics.subjectsTakenSummary?.failed ?? 0} failed`,
      },
    ]);

    drawSectionTitle(
      doc,
      'Academic Intelligence',
      'Eligibility, risk, and projected graduation timeline',
    );
    drawKeyValueGrid(doc, [
      {
        label: 'Estimated Graduation',
        value: analytics.estimatedGraduationDate?.label || 'N/A',
      },
      {
        label: 'Review Workflow',
        value: analytics.adviserReviewWorkflow?.reviewStatus || 'N/A',
      },
    ]);
    drawPrerequisiteHighlights(doc, analytics);

    drawSectionTitle(
      doc,
      'Remaining Coursework',
      'Courses without grades from the active study plan version',
    );
    drawStudyPlanRows(doc, activeVersion?.StudyPlanCourses || []);

    drawSectionTitle(doc, 'Validation & Metadata', 'Adviser validation and generation context');
    drawKeyValueGrid(doc, [
      { label: 'Validating Adviser', value: validatingAdviserName },
      { label: 'Validated At', value: formatTimestamp(activeVersion?.validatedAt) },
      { label: 'Record ID', value: String(sar.id || 'N/A') },
      { label: 'Version Metadata', value: formatVersionMetadata(activeVersion) },
    ]);

    doc.moveDown(0.6);
    const footerLineY = doc.y;
    doc
      .moveTo(doc.page.margins.left, footerLineY)
      .lineTo(doc.page.width - doc.page.margins.right, footerLineY)
      .lineWidth(0.5)
      .strokeColor(BRAND.gold)
      .stroke();
    doc.moveDown(0.3);
    doc
      .fontSize(7.8)
      .fillColor(BRAND.subtle)
      .font('Helvetica')
      .text(
        `Generated by Student Advising Portal  •  ${new Date().toLocaleString()}  •  Curriculum: ${sar.Curriculum?.name || 'N/A'}`,
        { align: 'center' },
      );

    doc.end();
  } catch (error) {
    next(error);
  }
};
