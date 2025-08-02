-- Guru Granth Sahib Shabad Recording System Database Schema

-- Users table for all system users (performers, approvers, mixers, administrators)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('performer', 'approver', 'mixer', 'narrator', 'administrator')),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Raags table
CREATE TABLE raags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    thaat VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shabads table - core content from Guru Granth Sahib
CREATE TABLE shabads (
    id SERIAL PRIMARY KEY,
    ang_number INTEGER NOT NULL, -- Page number in Guru Granth Sahib
    shabad_number INTEGER NOT NULL,
    raag_id INTEGER REFERENCES raags(id),
    guru_author VARCHAR(100), -- Which Guru or contributor
    first_line TEXT NOT NULL, -- First line of the shabad for identification
    full_text TEXT NOT NULL,
    language VARCHAR(50) DEFAULT 'gurmukhi',
    translation_english TEXT,
    translation_punjabi TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ang_number, shabad_number)
);

-- Recording sessions for organizing multi-track recordings
CREATE TABLE recording_sessions (
    id SERIAL PRIMARY KEY,
    shabad_id INTEGER REFERENCES shabads(id) NOT NULL,
    session_name VARCHAR(255) NOT NULL,
    studio_location VARCHAR(255),
    session_date DATE NOT NULL,
    session_start_time TIMESTAMP,
    session_end_time TIMESTAMP,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled'))
);

-- Individual tracks within a recording session
CREATE TABLE tracks (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES recording_sessions(id) NOT NULL,
    track_number INTEGER NOT NULL,
    track_name VARCHAR(255) NOT NULL,
    performer_id INTEGER REFERENCES users(id) NOT NULL,
    instrument VARCHAR(100),
    track_type VARCHAR(50) CHECK (track_type IN ('vocal', 'instrumental', 'percussion', 'harmony')),
    file_path VARCHAR(500), -- S3 path
    file_size_mb DECIMAL(10,2),
    duration_seconds INTEGER,
    sample_rate INTEGER DEFAULT 48000,
    bit_depth INTEGER DEFAULT 24,
    file_format VARCHAR(10) DEFAULT 'wav',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recording_quality VARCHAR(50) CHECK (recording_quality IN ('excellent', 'good', 'fair', 'needs_rerecording')),
    technical_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    s3_bucket VARCHAR(100),
    s3_key VARCHAR(500)
);

-- Narrator recordings for shabad explanations
CREATE TABLE narrator_recordings (
    id SERIAL PRIMARY KEY,
    shabad_id INTEGER REFERENCES shabads(id) NOT NULL,
    narrator_id INTEGER REFERENCES users(id) NOT NULL,
    recording_date DATE NOT NULL,
    file_path VARCHAR(500), -- S3 path
    file_size_mb DECIMAL(10,2),
    duration_seconds INTEGER,
    language VARCHAR(50) DEFAULT 'punjabi',
    script_text TEXT,
    recording_quality VARCHAR(50) CHECK (recording_quality IN ('excellent', 'good', 'fair', 'needs_rerecording')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    s3_bucket VARCHAR(100),
    s3_key VARCHAR(500)
);

-- Approval workflow for recordings
CREATE TABLE approvals (
    id SERIAL PRIMARY KEY,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('track', 'narrator_recording', 'mixed_track', 'final_mix')),
    item_id INTEGER NOT NULL, -- References tracks.id, narrator_recordings.id, etc.
    approver_id INTEGER REFERENCES users(id) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_revision')),
    decision_date TIMESTAMP,
    comments TEXT,
    revision_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mixed tracks (after individual track approval)
CREATE TABLE mixed_tracks (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES recording_sessions(id) NOT NULL,
    mixer_id INTEGER REFERENCES users(id) NOT NULL,
    mix_version INTEGER DEFAULT 1,
    file_path VARCHAR(500), -- S3 path
    file_size_mb DECIMAL(10,2),
    duration_seconds INTEGER,
    mix_notes TEXT,
    technical_specs JSON, -- EQ settings, effects used, etc.
    mixed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    s3_bucket VARCHAR(100),
    s3_key VARCHAR(500)
);

-- Final compositions (narrator + mixed shabad)
CREATE TABLE final_compositions (
    id SERIAL PRIMARY KEY,
    shabad_id INTEGER REFERENCES shabads(id) NOT NULL,
    mixed_track_id INTEGER REFERENCES mixed_tracks(id) NOT NULL,
    narrator_recording_id INTEGER REFERENCES narrator_recordings(id),
    final_mixer_id INTEGER REFERENCES users(id) NOT NULL,
    file_path VARCHAR(500), -- S3 path
    file_size_mb DECIMAL(10,2),
    duration_seconds INTEGER,
    composition_notes TEXT,
    mastered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_final_version BOOLEAN DEFAULT FALSE,
    version_number INTEGER DEFAULT 1,
    s3_bucket VARCHAR(100),
    s3_key VARCHAR(500)
);

-- Communication between approvers and mixers
CREATE TABLE communications (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER REFERENCES users(id) NOT NULL,
    to_user_id INTEGER REFERENCES users(id) NOT NULL,
    related_item_type VARCHAR(50) CHECK (related_item_type IN ('track', 'narrator_recording', 'mixed_track', 'final_mix')),
    related_item_id INTEGER,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    replied_to INTEGER REFERENCES communications(id) -- For threading
);

-- Audio processing jobs queue
CREATE TABLE processing_jobs (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('upload', 'transcode', 'normalize', 'mix', 'master')),
    item_type VARCHAR(50) NOT NULL,
    item_id INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    progress_percent INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_shabads_raag ON shabads(raag_id);
CREATE INDEX idx_shabads_ang ON shabads(ang_number);
CREATE INDEX idx_tracks_session ON tracks(session_id);
CREATE INDEX idx_tracks_performer ON tracks(performer_id);
CREATE INDEX idx_approvals_item ON approvals(item_type, item_id);
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_communications_users ON communications(from_user_id, to_user_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);

-- Insert some basic raags
INSERT INTO raags (name, thaat, description) VALUES 
('Asa', 'Bilawal', 'Morning raag, evokes hope and aspiration'),
('Gujari', 'Bhairav', 'Morning raag, peaceful and devotional'),
('Devgandhari', 'Khamaj', 'Evening raag, expressive and emotional'),
('Bihagra', 'Bilawal', 'Morning raag, joyful and uplifting'),
('Vadahans', 'Bilawal', 'Midday raag, majestic and powerful'),
('Sorath', 'Khamaj', 'Afternoon raag, gentle and soothing'),
('Dhanasri', 'Khamaj', 'Late morning raag, melodious'),
('Jaitsri', 'Khamaj', 'Afternoon raag, contemplative'),
('Todi', 'Todi', 'Morning raag, serious and devotional'),
('Bairari', 'Bhairav', 'Morning raag, peaceful'),
('Tilang', 'Khamaj', 'Evening raag, romantic'),
('Suhi', 'Bhairav', 'Late night raag, intense devotion'),
('Bilawal', 'Bilawal', 'Morning raag, pure and serene'),
('Gond', 'Khamaj', 'Midday raag, powerful'),
('Ramkali', 'Bhairav', 'Early morning raag, awakening'),
('Nat', 'Kalyan', 'Evening raag, playful'),
('Maligaura', 'Bhairav', 'Morning raag, gentle'),
('Maru', 'Marwa', 'Evening raag, longing'),
('Tukhari', 'Todi', 'Morning raag, serious'),
('Kedara', 'Kalyan', 'Night raag, romantic'),
('Bhairao', 'Bhairav', 'Early morning raag, awakening'),
('Basant', 'Purvi', 'Spring raag, joyful'),
('Sarang', 'Khamaj', 'Midday raag, bright'),
('Malkauns', 'Bhairavi', 'Late night raag, deep meditation'),
('Kanra', 'Khamaj', 'Evening raag, melodious'),
('Kalyan', 'Kalyan', 'Night raag, peaceful'),
('Prabhati', 'Bhairav', 'Dawn raag, awakening'),
('Jaijawanti', 'Khamaj', 'Night raag, romantic');