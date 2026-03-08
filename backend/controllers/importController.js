const multer = require('multer');
const csv = require('csv-parser');
const bcrypt = require('bcryptjs');
const { Readable } = require('stream');
const { User, Grade, Subject } = require('../models');

// Configure multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

// Helper: parse a CSV buffer into an array of row objects
function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer.toString());
    stream
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

// POST /api/import/users
exports.uploadUsers = upload.single('file');

exports.importUsers = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const rows = await parseCSV(req.file.buffer);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }

    // Validate required columns
    const requiredCols = ['studentId', 'firstName', 'lastName', 'email'];
    const headers = Object.keys(rows[0]);
    const missing = requiredCols.filter(c => !headers.includes(c));
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missing.join(', ')}`
      });
    }

    const DEFAULT_PASSWORD = 'ChangeMeNow123!';
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const { studentId, firstName, lastName, email } = row;

        if (!studentId || !firstName || !lastName || !email) {
          errors.push({ row, reason: 'Missing required field(s)' });
          skipped++;
          continue;
        }

        // Check if user already exists by email or studentId
        const existing = await User.findOne({
          where: { email: email.trim().toLowerCase() }
        });

        if (existing) {
          skipped++;
          continue;
        }

        await User.create({
          studentId: studentId.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          role: 'student',
          isActive: true,
          isVerified: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

        created++;
      } catch (err) {
        errors.push({ row, reason: err.message });
        skipped++;
      }
    }

    res.json({
      success: true,
      message: `Import complete: ${created} created, ${skipped} skipped`,
      data: { created, skipped, errors: errors.length > 0 ? errors : undefined }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/import/grades
exports.uploadGrades = upload.single('file');

exports.importGrades = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const rows = await parseCSV(req.file.buffer);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'CSV file is empty' });
    }

    // Validate required columns
    const requiredCols = ['studentId', 'course_code', 'grade_value', 'term_taken'];
    const headers = Object.keys(rows[0]);
    const missing = requiredCols.filter(c => !headers.includes(c));
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missing.join(', ')}`
      });
    }

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const { studentId, course_code, grade_value, term_taken } = row;

        if (!studentId || !course_code || !grade_value || !term_taken) {
          errors.push({ row, reason: 'Missing required field(s)' });
          skipped++;
          continue;
        }

        // Look up user by studentId
        const user = await User.findOne({
          where: { studentId: studentId.trim() }
        });

        if (!user) {
          errors.push({ row, reason: `User with studentId '${studentId}' not found` });
          skipped++;
          continue;
        }

        // Look up subject by course_code
        const subject = await Subject.findOne({
          where: { course_code: course_code.trim() }
        });

        if (!subject) {
          errors.push({ row, reason: `Subject with course_code '${course_code}' not found` });
          skipped++;
          continue;
        }

        await Grade.create({
          UserId: user.id,
          SubjectId: subject.id,
          grade_value: parseFloat(grade_value),
          term_taken: term_taken.trim(),
          status: 'verified'
        });

        created++;
      } catch (err) {
        errors.push({ row, reason: err.message });
        skipped++;
      }
    }

    res.json({
      success: true,
      message: `Import complete: ${created} created, ${skipped} skipped`,
      data: { created, skipped, errors: errors.length > 0 ? errors : undefined }
    });
  } catch (error) {
    next(error);
  }
};
