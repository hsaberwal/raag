const { Pool } = require('pg');
require('dotenv').config();

let pool = null;

// Lazy initialization - only create pool when actually needed
function getPool() {
    if (!pool) {
        console.log('🔗 Initializing PostgreSQL connection pool...');
        pool = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            max: 20, // Maximum number of clients in the pool
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Test the connection
        pool.on('connect', () => {
            console.log('Connected to PostgreSQL database');
        });

        pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
            process.exit(-1);
        });
    }
    return pool;
}

module.exports = {
    get pool() { return getPool(); },
    query: (text, params) => getPool().query(text, params),
};