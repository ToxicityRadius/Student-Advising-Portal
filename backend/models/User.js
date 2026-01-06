const db = require('../database/db');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData) {
    const { studentId, firstName, lastName, email, password, role, activationToken, activationTokenExpires } = userData;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const sql = `
      INSERT INTO users ("studentId", "firstName", "lastName", email, password, role, "activationToken", "activationTokenExpires")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await db.query(
      sql,
      [studentId, firstName, lastName, email, hashedPassword, role || 'student', activationToken, activationTokenExpires]
    );
    
    return this.formatUser(result.rows[0]);
  }

  static formatUser(user) {
    if (!user) return null;
    return {
      ...user,
      _id: user.id,
      createdAt: new Date(Number(user.createdAt)),
      updatedAt: new Date(Number(user.updatedAt)),
      lastLogin: user.lastLogin ? new Date(Number(user.lastLogin)) : null
    };
  }

  static async findById(id) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return this.formatUser(result.rows[0]);
  }

  static async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return this.formatUser(result.rows[0]);
  }

  static async findByStudentId(studentId) {
    const result = await db.query('SELECT * FROM users WHERE "studentId" = $1', [studentId]);
    return this.formatUser(result.rows[0]);
  }

  static async findByActivationToken(token) {
    const now = Date.now();
    const sql = `
      SELECT * FROM users 
      WHERE "activationToken" = $1 AND "activationTokenExpires" > $2
    `;
    const result = await db.query(sql, [token, now]);
    return this.formatUser(result.rows[0]);
  }

  static async findAll() {
    const result = await db.query('SELECT * FROM users ORDER BY "createdAt" DESC');
    return result.rows.map(user => {
      const formattedUser = this.formatUser(user);
      delete formattedUser.password;
      delete formattedUser.activationToken;
      delete formattedUser.activationTokenExpires;
      delete formattedUser.resetPasswordToken;
      delete formattedUser.resetPasswordExpires;
      return formattedUser;
    });
  }

  static async update(id, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updateData.studentId !== undefined) {
      fields.push(`"studentId" = $${paramCount++}`);
      values.push(updateData.studentId);
    }
    if (updateData.firstName) {
      fields.push(`"firstName" = $${paramCount++}`);
      values.push(updateData.firstName);
    }
    if (updateData.lastName) {
      fields.push(`"lastName" = $${paramCount++}`);
      values.push(updateData.lastName);
    }
    if (updateData.email) {
      fields.push(`email = $${paramCount++}`);
      values.push(updateData.email);
    }
    if (updateData.role) {
      fields.push(`role = $${paramCount++}`);
      values.push(updateData.role);
    }
    if (typeof updateData.isActive === 'boolean') {
      fields.push(`"isActive" = $${paramCount++}`);
      values.push(updateData.isActive);
    }
    if (updateData.activationToken !== undefined) {
      fields.push(`"activationToken" = $${paramCount++}`);
      values.push(updateData.activationToken);
    }
    if (updateData.activationTokenExpires !== undefined) {
      fields.push(`"activationTokenExpires" = $${paramCount++}`);
      values.push(updateData.activationTokenExpires);
    }
    if (updateData.resetPasswordToken !== undefined) {
      fields.push(`"resetPasswordToken" = $${paramCount++}`);
      values.push(updateData.resetPasswordToken);
    }
    if (updateData.resetPasswordExpires !== undefined) {
      fields.push(`"resetPasswordExpires" = $${paramCount++}`);
      values.push(updateData.resetPasswordExpires);
    }
    if (updateData.lastLogin) {
      fields.push(`"lastLogin" = $${paramCount++}`);
      values.push(Date.now());
    }
    if (updateData.verificationCode !== undefined) {
      fields.push(`"verificationCode" = $${paramCount++}`);
      values.push(updateData.verificationCode);
    }
    if (updateData.verificationCodeExpires !== undefined) {
      fields.push(`"verificationCodeExpires" = $${paramCount++}`);
      values.push(updateData.verificationCodeExpires);
    }
    if (typeof updateData.isVerified === 'boolean') {
      fields.push(`"isVerified" = $${paramCount++}`);
      values.push(updateData.isVerified);
    }

    fields.push(`"updatedAt" = $${paramCount++}`);
    values.push(Date.now());

    values.push(id);

    const sql = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await db.query(sql, values);
    return this.formatUser(result.rows[0]);
  }

  static async delete(id) {
    return await db.query('DELETE FROM users WHERE id = $1', [id]);
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async findByResetToken(token) {
    const now = Date.now();
    const sql = `
      SELECT * FROM users 
      WHERE "resetPasswordToken" = $1 AND "resetPasswordExpires" > $2
    `;
    const result = await db.query(sql, [token, now]);
    return this.formatUser(result.rows[0]);
  }

  static async updatePassword(id, hashedPassword) {
    const sql = `
      UPDATE users 
      SET password = $1, 
          "resetPasswordToken" = NULL, 
          "resetPasswordExpires" = NULL,
          "updatedAt" = $2
      WHERE id = $3
      RETURNING *
    `;
    const result = await db.query(sql, [hashedPassword, Date.now(), id]);
    return this.formatUser(result.rows[0]);
  }

  static toJSON(user) {
    if (!user) return null;
    const userObj = { ...user };
    delete userObj.password;
    delete userObj.activationToken;
    delete userObj.activationTokenExpires;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;
    delete userObj.verificationCode;
    delete userObj.verificationCodeExpires;
    return userObj;
  }

  static generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  }

  static async findByVerificationCode(code) {
    const now = Date.now();
    const sql = `
      SELECT * FROM users 
      WHERE "verificationCode" = $1 AND "verificationCodeExpires" > $2
    `;
    const result = await db.query(sql, [code, now]);
    return this.formatUser(result.rows[0]);
  }
}

module.exports = User;
