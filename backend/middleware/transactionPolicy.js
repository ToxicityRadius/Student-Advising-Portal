/**
 * Transaction policy helpers for controllers/services.
 *
 * Use `withTransaction(sequelize, work)` for any operation that mutates
 * multiple models/tables and must be atomic.
 */

async function withTransaction(sequelize, work) {
  const transaction = await sequelize.transaction();
  try {
    const result = await work(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = { withTransaction };
