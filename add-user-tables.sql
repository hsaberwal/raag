-- Add User Management Tables to Existing Database

-- User Management Tables (for authentication and authorization)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'performer', -- 'performer', 'approver', 'mixer', 'narrator', 'administrator', 'qc', 'uploader'
    full_name VARCHAR(255),
    artist_id VARCHAR(20), -- Link to artists table if user is also an artist
    active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artist_id) REFERENCES artists(artist_id)
);

CREATE TABLE user_sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_permissions (
    permission_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    resource VARCHAR(100) NOT NULL, -- 'shabads', 'recordings', 'mixing', etc.
    action VARCHAR(50) NOT NULL,    -- 'read', 'write', 'approve', 'delete'
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER REFERENCES users(user_id)
);

-- Create trigger for users table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default test users for the system
INSERT INTO users (username, role, full_name, active) VALUES
('performer1', 'performer', 'Test Performer', TRUE),
('approver1', 'approver', 'Test Approver', TRUE),
('mixer1', 'mixer', 'Test Mixer', TRUE),
('narrator1', 'narrator', 'Test Narrator', TRUE),
('admin1', 'administrator', 'Test Administrator', TRUE),
('qc1', 'qc', 'Test QC Specialist', TRUE);

-- Grant basic permissions
INSERT INTO user_permissions (user_id, resource, action) VALUES
-- Performers can create recordings
(1, 'recordings', 'read'), (1, 'recordings', 'write'),
(1, 'shabads', 'read'),
-- Approvers can approve recordings and mixing
(2, 'recordings', 'read'), (2, 'recordings', 'approve'),
(2, 'mixing', 'read'), (2, 'mixing', 'approve'),
(2, 'shabads', 'read'),
-- Mixers can access mixing sessions
(3, 'mixing', 'read'), (3, 'mixing', 'write'),
(3, 'recordings', 'read'), (3, 'shabads', 'read'),
-- Narrators can create katha sessions
(4, 'katha', 'read'), (4, 'katha', 'write'),
(4, 'shabads', 'read'),
-- Administrators have full access
(5, 'all', 'all'),
-- QC specialists can access QC functions
(6, 'qc', 'read'), (6, 'qc', 'write'),
(6, 'releases', 'read'), (6, 'releases', 'approve'),
(6, 'shabads', 'read');