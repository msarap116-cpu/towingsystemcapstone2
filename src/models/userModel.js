//you are in userModel.js
const db = require('../database/database');
const bcrypt = require('bcryptjs');

const User = {
    async create({ name, email, phone, password, role }) {
        try {
            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user into DB
            const sql = `INSERT INTO users (name, email, phone, password, role) VALUES (?,?,?,?,?)`;
            const result = await db.query(sql, [name, email, phone, hashedPassword, role]);

            console.log('DB insert result:', result); // Debugging
            return result.insertId;
        } catch (error) {
            console.error('User.create error:', error);
            throw error; // propagate error to controller
        }
    },

async findByEmail(email) {
    const sql = `SELECT user_id AS id, name, email, phone, password, role 
                 FROM users WHERE email = ?`;
    const result = await db.query(sql, [email]);
    // handle both [[rows], fields] and [rows] return shapes
    const rows = Array.isArray(result[0]) ? result[0] : result;
    return rows[0] || null;
},

  async findById(user_id) {
    try {
        const sql = `SELECT user_id AS id, name, email, phone, role, created_at 
                     FROM users WHERE user_id = ?`;
        // 0123 040126
        // const result = await db.query(sql, [user_id]);

        // console.log("findById result:", result); 

        // return result[0] || null; 
        const rows = await db.query(sql, [user_id]);

        console.log("rows:", rows); // debug

        return rows[0] || null;

    } catch (err) {
        console.error('DB error in findById:', err);
        throw err;
    }
},

    async verificationPassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    },

    async update(user_id, { name,email, phone, role }) {
        const sql = 'UPDATE users SET name = ?,email = ? ,phone = ?, role = ? WHERE user_id = ?';
        await db.query(sql, [name, email,phone,role,user_id]);
        return true;
    },

    async getAllDrivers() {
        const sql = 'SELECT user_id, name, email, phone FROM users WHERE role = "driver"';
        return await db.query(sql);
    },
async getAllUsers() {
    const sql = `SELECT user_id AS id, name, email, phone, role 
                 FROM users ORDER BY user_id ASC`;
    return await db.query(sql);
},
async delete(user_id) {
    const sql = 'DELETE FROM users WHERE user_id = ?';
    await db.query(sql, [user_id]);
    return true;
},
};


module.exports = User;