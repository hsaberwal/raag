// Shared database module - now always uses PostgreSQL (containerized)
console.log('🔍 Database module - PostgreSQL (containerized)');
console.log('   DB_HOST:', process.env.DB_HOST);
console.log('   DB_NAME:', process.env.DB_NAME);
console.log('   DB_USER:', process.env.DB_USER);

console.log('🔗 Loading PostgreSQL database...');
const db = require('./database');
console.log('✅ PostgreSQL database loaded');

module.exports = db;