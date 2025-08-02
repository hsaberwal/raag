const fs = require('fs');
const path = require('path');

// Simple file-based database for testing (no PostgreSQL required)
class TestDatabase {
    constructor() {
        this.dataFile = path.join(__dirname, '..', 'test_data.json');
        this.data = this.loadData();
        this.nextId = {
            users: Math.max(...this.data.users.map(u => u.id), 0) + 1,
            raags: Math.max(...this.data.raags.map(r => r.id), 0) + 1,
            shabads: Math.max(...this.data.shabads.map(s => s.id), 0) + 1,
            recording_sessions: 1,
            tracks: 1,
            approvals: 1,
            communications: 1,
            narrator_recordings: 1,
            mixed_tracks: 1,
            final_compositions: 1
        };
    }

    loadData() {
        try {
            if (fs.existsSync(this.dataFile)) {
                return JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading test data:', error);
        }
        
        // Default data structure
        return {
            users: [],
            raags: [],
            shabads: [],
            recording_sessions: [],
            tracks: [],
            approvals: [],
            communications: [],
            narrator_recordings: [],
            mixed_tracks: [],
            final_compositions: []
        };
    }

    saveData() {
        try {
            fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('Error saving test data:', error);
        }
    }

    // Simulate PostgreSQL query interface
    async query(sql, params = []) {
        console.log('Test DB Query:', sql, params);
        
        // Simple query parser for common operations
        const sqlLower = sql.toLowerCase().trim();
        
        if (sqlLower.startsWith('select')) {
            return this.handleSelect(sql, params);
        } else if (sqlLower.startsWith('insert')) {
            return this.handleInsert(sql, params);
        } else if (sqlLower.startsWith('update')) {
            return this.handleUpdate(sql, params);
        } else if (sqlLower.startsWith('delete')) {
            return this.handleDelete(sql, params);
        } else {
            // For other queries (like CREATE TABLE), just return success
            return { rows: [], rowCount: 0 };
        }
    }

    handleSelect(sql, params) {
        // Simple select handling for common queries
        if (sql.includes('FROM users')) {
            let results = [...this.data.users];
            
            if (sql.includes('WHERE username = $1')) {
                results = results.filter(u => u.username === params[0]);
            } else if (sql.includes('WHERE id = $1')) {
                results = results.filter(u => u.id === parseInt(params[0]));
            } else if (sql.includes('WHERE role = $1')) {
                results = results.filter(u => u.role === params[0]);
            }
            
            return { rows: results, rowCount: results.length };
        }
        
        if (sql.includes('FROM raags')) {
            return { rows: this.data.raags, rowCount: this.data.raags.length };
        }
        
        if (sql.includes('FROM shabads')) {
            let results = [...this.data.shabads];
            
            // Add raag information
            results = results.map(shabad => {
                const raag = this.data.raags.find(r => r.id === shabad.raag_id);
                return {
                    ...shabad,
                    raag_name: raag ? raag.name : 'Unknown',
                    thaat: raag ? raag.thaat : '',
                    session_count: 0,
                    narrator_recording_count: 0,
                    completed_count: 0
                };
            });
            
            // Apply basic filtering
            if (sql.includes('WHERE') && params.length > 0) {
                if (sql.includes('raag_id = $1')) {
                    results = results.filter(s => s.raag_id === parseInt(params[0]));
                } else if (sql.includes('id = $1')) {
                    results = results.filter(s => s.id === parseInt(params[0]));
                }
            }
            
            // Apply LIMIT
            if (sql.includes('LIMIT')) {
                const limitMatch = sql.match(/LIMIT \$(\d+)/);
                if (limitMatch) {
                    const limitIndex = parseInt(limitMatch[1]) - 1;
                    const limit = parseInt(params[limitIndex]);
                    results = results.slice(0, limit);
                }
            }
            
            return { rows: results, rowCount: results.length };
        }
        
        if (sql.includes('FROM tracks')) {
            return { rows: this.data.tracks || [], rowCount: (this.data.tracks || []).length };
        }
        
        if (sql.includes('FROM approvals')) {
            return { rows: this.data.approvals || [], rowCount: (this.data.approvals || []).length };
        }
        
        if (sql.includes('FROM communications')) {
            return { rows: this.data.communications || [], rowCount: (this.data.communications || []).length };
        }
        
        // For statistics queries, return mock data
        if (sql.includes('COUNT(*)')) {
            return { rows: [{ count: '10' }], rowCount: 1 };
        }
        
        // Default empty result
        return { rows: [], rowCount: 0 };
    }

    handleInsert(sql, params) {
        const sqlLower = sql.toLowerCase();
        
        if (sqlLower.includes('into users')) {
            const newUser = {
                id: this.nextId.users++,
                username: params[0],
                email: params[1],
                full_name: params[2],
                role: params[3],
                phone: params[4] || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_active: true
            };
            this.data.users.push(newUser);
            this.saveData();
            return { rows: [newUser], rowCount: 1 };
        }
        
        if (sqlLower.includes('into recording_sessions')) {
            const newSession = {
                id: this.nextId.recording_sessions++,
                shabad_id: params[0],
                session_name: params[1],
                studio_location: params[2],
                session_date: params[3],
                session_start_time: params[4],
                notes: params[5],
                created_by: params[6],
                created_at: new Date().toISOString(),
                status: 'in_progress'
            };
            if (!this.data.recording_sessions) this.data.recording_sessions = [];
            this.data.recording_sessions.push(newSession);
            this.saveData();
            return { rows: [newSession], rowCount: 1 };
        }
        
        if (sqlLower.includes('into tracks')) {
            const newTrack = {
                id: this.nextId.tracks++,
                session_id: params[0],
                track_number: params[1],
                track_name: params[2],
                performer_id: params[3],
                instrument: params[4],
                track_type: params[5],
                s3_key: params[6],
                s3_bucket: params[7],
                file_size_mb: params[8],
                duration_seconds: params[9],
                sample_rate: params[10],
                bit_depth: params[11],
                file_format: params[12],
                recording_quality: params[13],
                technical_notes: params[14],
                recorded_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
            if (!this.data.tracks) this.data.tracks = [];
            this.data.tracks.push(newTrack);
            this.saveData();
            return { rows: [newTrack], rowCount: 1 };
        }
        
        if (sqlLower.includes('into approvals')) {
            const newApproval = {
                id: this.nextId.approvals++,
                item_type: params[0],
                item_id: params[1],
                status: params[2] || 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            if (!this.data.approvals) this.data.approvals = [];
            this.data.approvals.push(newApproval);
            this.saveData();
            return { rows: [newApproval], rowCount: 1 };
        }
        
        // Default empty result for unknown inserts
        return { rows: [], rowCount: 0 };
    }

    handleUpdate(sql, params) {
        // Simple update handling
        return { rows: [], rowCount: 1 };
    }

    handleDelete(sql, params) {
        // Simple delete handling
        return { rows: [], rowCount: 1 };
    }
}

let testDb = null;

function getTestDatabase() {
    if (!testDb) {
        testDb = new TestDatabase();
    }
    return testDb;
}

module.exports = {
    pool: {
        query: (sql, params) => getTestDatabase().query(sql, params)
    },
    query: (sql, params) => getTestDatabase().query(sql, params)
};