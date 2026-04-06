// src/database/database.js
const mysql = require("mysql2/promise");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// SSL certificate path
const sslCA = process.env.DB_SSL === 'true'
    ? fs.readFileSync(path.join(__dirname, '../../ca.pem'))
    : null;

// Create the connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectionLimit: 10,
    ssl: process.env.DB_SSL === 'true' ? {
        ca: sslCA,
        rejectUnauthorized: true
    } : false
});

// Test connection function
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Successfully connected to MySQL database');
        
        const [rows] = await connection.query('SELECT 1 + 1 AS solution');
        console.log('Database query test successful');
        
        connection.release();
        return true;
    } catch (error) {
        console.error('Failed to connect to database:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('Check your username and password');
        } else if (error.code === 'ENOTFOUND') {
            console.error('Check your host name');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('Check your port number');
        } else if (error.message.includes('SSL')) {
            console.log('SSL certificate issue - check ca.pem file');
        }
        return false;
    }
}

// Query function
async function query(sql, params) {
    try {
        const [result] = await pool.execute(sql, params || []);
        return result;
    } catch (error) {
        console.error('Database query error:', error);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw error;
    }
}

// Export functions
module.exports = {
    query,
    getConnection: async () => await pool.getConnection(),
    testConnection,
    pool
};

// src/database/database.js
const mysql = require("mysql2/promise");
require('dotenv').config();

// Create the connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectionLimit: 10,
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false  // 👈 Changed this
    } : false
});

// Test connection function
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Successfully connected to MySQL database');
        
        const [rows] = await connection.query('SELECT 1 + 1 AS solution');
        console.log('Database query test successful');
        
        connection.release();
        return true;
    } catch (error) {
        console.error('Failed to connect to database:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('Check your username and password');
        } else if (error.code === 'ENOTFOUND') {
            console.error('Check your host name');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('Check your port number');
        } else if (error.message.includes('SSL')) {
            console.log('SSL certificate issue');
        }
        return false;
    }
}

// Query function
async function query(sql, params) {
    try {
        const [result] = await pool.execute(sql, params || []);
        return result;
    } catch (error) {
        console.error('Database query error:', error);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw error;
    }
}

// Export functions
module.exports = {
    query,
    getConnection: async () => await pool.getConnection(),
    testConnection,
    pool
};