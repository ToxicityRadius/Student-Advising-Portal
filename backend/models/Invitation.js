const db = require('../database/db');

class Invitation {
  static async create(invitationData) {
    const { email, role, invitationToken, invitationExpires, invitedBy } = invitationData;
    
    const sql = `
      INSERT INTO faculty_invitations (email, role, "invitationToken", "invitationExpires", "invitedBy")
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await db.query(
      sql,
      [email, role, invitationToken, invitationExpires, invitedBy]
    );
    
    return this.formatInvitation(result.rows[0]);
  }

  static formatInvitation(invitation) {
    if (!invitation) return null;
    return {
      ...invitation,
      createdAt: new Date(Number(invitation.createdAt))
    };
  }

  static async findByToken(token) {
    const now = Date.now();
    const sql = `
      SELECT * FROM faculty_invitations 
      WHERE "invitationToken" = $1 
        AND "invitationExpires" > $2 
        AND "isUsed" = false
    `;
    const result = await db.query(sql, [token, now]);
    return this.formatInvitation(result.rows[0]);
  }

  static async findByEmail(email) {
    const sql = `
      SELECT * FROM faculty_invitations 
      WHERE email = $1 
      ORDER BY "createdAt" DESC 
      LIMIT 1
    `;
    const result = await db.query(sql, [email]);
    return this.formatInvitation(result.rows[0]);
  }

  static async markAsUsed(id) {
    const sql = `
      UPDATE faculty_invitations 
      SET "isUsed" = true 
      WHERE id = $1 
      RETURNING *
    `;
    const result = await db.query(sql, [id]);
    return this.formatInvitation(result.rows[0]);
  }

  static async findAll() {
    const sql = `
      SELECT fi.*, 
        u."firstName" || ' ' || u."lastName" as "invitedByName"
      FROM faculty_invitations fi
      LEFT JOIN users u ON fi."invitedBy" = u.id
      ORDER BY fi."createdAt" DESC
    `;
    const result = await db.query(sql);
    return result.rows.map(inv => this.formatInvitation(inv));
  }

  static async findPending() {
    const now = Date.now();
    const sql = `
      SELECT fi.*, 
        u."firstName" || ' ' || u."lastName" as "invitedByName"
      FROM faculty_invitations fi
      LEFT JOIN users u ON fi."invitedBy" = u.id
      WHERE fi."isUsed" = false AND fi."invitationExpires" > $1
      ORDER BY fi."createdAt" DESC
    `;
    const result = await db.query(sql, [now]);
    return result.rows.map(inv => this.formatInvitation(inv));
  }

  static async delete(id) {
    const sql = 'DELETE FROM faculty_invitations WHERE id = $1';
    await db.query(sql, [id]);
  }
}

module.exports = Invitation;
