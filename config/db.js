// Shared database module that automatically selects test vs production database
const useTestMode = process.env.USE_LOCAL_STORAGE === 'true' || !process.env.DB_HOST;

console.log('🔍 Database module - useTestMode:', useTestMode);
console.log('   USE_LOCAL_STORAGE:', process.env.USE_LOCAL_STORAGE);
console.log('   DB_HOST:', process.env.DB_HOST);

let db;
if (useTestMode) {
    console.log('📋 Loading test database...');
    db = require('./test-database');
    console.log('✅ Test database loaded');
} else {
    console.log('🔗 Loading PostgreSQL database...');
    db = require('./database');
    console.log('✅ PostgreSQL database loaded');
}

module.exports = db;