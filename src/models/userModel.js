//you are in userModel.js
const db = require('../database/database');
const bcrypt = require('bcryptjs');

const User = {
    //this where the user fill the application letter
    async create({ name, email, phone, password, role }) {
        try {
            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user into DB
            const sql = `INSERT INTO users (name, email, phone, password, role) VALUES (?,?,?,?,?)`;
            const result = await db.query(sql, [name, email, phone, hashedPassword, role]);

            console.log('DB insert result:', result);
            return result.insertId;
        } catch (error) {
            console.error('User.create error:', error);

            // Check for duplicate email error (MySQL error code 1062)
            if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
                const duplicateError = new Error('Email already in use');
                duplicateError.code = 'DUPLICATE_EMAIL';
                throw duplicateError;
            }

            throw error; // propagate other errors to controller
        }
    },
    //finding nemo
    async findByEmail(email) {
        const sql = `SELECT user_id AS id, name, email, phone, password, role
                 FROM users WHERE email = ?`;
        const result = await db.query(sql, [email]);
        // handle both [[rows], fields] and [rows] return shapes
        const rows = Array.isArray(result[0]) ? result[0] : result;
        return rows[0] || null;
    },

    //finding id lace
    async findById(user_id) {
        try {
            const sql = ` SELECT
            user_id,
            name,
            email,
            phone,
            role,
            profile_picture,
            created_at
        FROM users
        WHERE user_id = ?`;
            // 0123 040126
            // const result = await db.query(sql, [user_id]);

            // console.log("findById result:", result);

            // return result[0] || null;
            const rows = await db.query(sql, [user_id]);

            // console.log("rows:", rows); // debug

            return rows[0] || null;

        } catch (err) {
            console.error('DB error in findById:', err);
            throw err;
        }
    },

    async verificationPassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    },

    // called on login — overwrites any previous session
    // called on login/logout
    async updateSessionId(user_id, sessionId) {

        // console.log(
        //     ' Updating session:',
        //     user_id,
        //     '→',
        //     sessionId


        // );

        const sql = `
        UPDATE users
        SET currentSessionId = ?
        WHERE user_id = ?
    `;

        await db.query(sql, [sessionId, user_id]);

        console.log('Session updated');

        return true;
    },

    // called by middleware
    async getSessionId(user_id) {

        const sql = `
        SELECT currentSessionId
        FROM users
        WHERE user_id = ?
    `;

        const rows = await db.query(sql, [user_id]);

        // console.log(
        //     '🔎 getSessionId:',
        //     user_id,
        //     '=>',
        //     rows[0]?.currentSessionId
        // );

        return rows[0]?.currentSessionId || null;
    },

    // // called on logout
    // async clearSessionId(user_id) {
    //     const sql = 'UPDATE users SET currentSessionId = NULL WHERE user_id = ?';
    //     await db.query(sql, [user_id]);
    //     return true;
    // },

    async update(user_id, { name, email, phone, role }) {
        const sql = 'UPDATE users SET name = ?,email = ? ,phone = ?, role = ? WHERE user_id = ?';
        await db.query(sql, [name, email, phone, role, user_id]);
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

    async updateProfilePicture(
        userId,
        profilePicture
    ) {

        const sql = `
        UPDATE users
        SET profile_picture = ?
        WHERE user_id = ?
    `;

        await db.query(sql, [
            profilePicture,
            userId
        ]);
    },



};




module.exports = User;