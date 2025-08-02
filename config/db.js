// Shared database module that automatically selects test vs production database
const useTestMode = process.env.USE_LOCAL_STORAGE === 'true' || 
                   !process.env.DB_HOST || 
                   process.env.FORCE_TEST_MODE === 'true';

console.log('🔍 Database module - useTestMode:', useTestMode);
console.log('   USE_LOCAL_STORAGE:', process.env.USE_LOCAL_STORAGE);
console.log('   FORCE_TEST_MODE:', process.env.FORCE_TEST_MODE);
console.log('   DB_HOST:', process.env.DB_HOST);

let db;
if (useTestMode) {
    console.log('📋 Loading test database (FORCED TEST MODE)...');
    try {
        db = require('./test-database');
        console.log('✅ Test database loaded successfully');
    } catch (error) {
        console.error('❌ Error loading test database:', error.message);
        // Create minimal fallback database
        db = {
            query: async (sql, params) => {
                console.log('💾 Fallback DB Query:', sql, params);
                return { rows: [], rowCount: 0 };
            }
        };
        console.log('✅ Fallback database created');
    }
} else {
    console.log('🔗 Loading PostgreSQL database...');
    try {
        db = require('./database');
        console.log('✅ PostgreSQL database loaded');
    } catch (error) {
        console.error('❌ Error loading PostgreSQL, falling back to test mode');
        db = require('./test-database');
    }
}

module.exports = db;