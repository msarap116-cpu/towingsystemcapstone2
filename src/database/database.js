// src/database/database.js

const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    connectTimeout: 10000,

    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,

    supportBigNumbers: true,
    nestTables: false,
    typeCast: true,

    ssl: process.env.DB_SSL === "true"
        ? {
            rejectUnauthorized: false
        }
        : undefined
});


async function testConnection() {
    let connection;

    try {
        connection = await pool.getConnection();

        const [rows] = await connection.execute(
            "SELECT 1 AS test"
        );

        console.log("GoodWrenchDatabase connection is alive:", rows);

        return true;

    } catch (error) {
        console.error("Database connection test failed:");
        console.error("Code:", error.code);
        console.error("Message:", error.message);

        return false;

    } finally {
        if (connection) {
            connection.release();
        }
    }
}


async function query(sql, params = []) {
    try {
        const [result] = await pool.execute(sql, params);

        return result;

    } catch (error) {

        console.error("Database query error");
        console.error("Code:", error.code);
        console.error("Message:", error.message);
        console.error("SQL:", sql);
        console.error("Params:", params);

        throw error;
    }
}


async function getConnection() {
    return await pool.getConnection();
}


module.exports = {
    query,
    getConnection,
    testConnection,
    pool
};