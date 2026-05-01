require('dotenv').config();

const { User, Program, UserProgramAssignment, sequelize } = require('./models');
const { DEFAULT_PROGRAM_CODE } = require('./constants');

async function promoteToAdmin() {
  try {
    const targetEmail = (process.argv[2] || process.env.TARGET_EMAIL || '').trim().toLowerCase();
    const targetRole = (process.argv[3] || process.env.TARGET_ROLE || 'admin').trim().toLowerCase();
    const targetProgramCode = (
      process.argv[4] ||
      process.env.TARGET_PROGRAM ||
      DEFAULT_PROGRAM_CODE
    )
      .trim()
      .toUpperCase();

    if (!targetEmail) {
      throw new Error(
        'Usage: node backend/make-admin.js <email> [admin|superadmin|adviser] [programCode]',
      );
    }

    if (!['admin', 'superadmin', 'adviser'].includes(targetRole)) {
      throw new Error('Role must be admin, superadmin, or adviser');
    }

    const [updatedRows] = await User.update(
      { role: targetRole, updatedAt: Date.now() },
      { where: { email: targetEmail } },
    );

    if (updatedRows > 0) {
      if (targetRole !== 'superadmin') {
        const program = await Program.findOne({ where: { code: targetProgramCode } });
        if (!program) {
          throw new Error(`Program ${targetProgramCode} not found`);
        }
        const user = await User.findOne({ where: { email: targetEmail } });
        await UserProgramAssignment.findOrCreate({
          where: { userId: user.id, programId: program.id },
          defaults: { createdAt: Date.now(), updatedAt: Date.now() },
        });
      }
      console.log(`Success! ${targetEmail} is now ${targetRole}.`);
    } else {
      console.log(`User with email ${targetEmail} not found.`);
    }
  } catch (error) {
    console.error('Error updating user:', error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

promoteToAdmin();
