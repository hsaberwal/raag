-- Updated Database Schema for Raag Recording System
-- Based on user requirements for professional recording workflow

-- Drop existing tables if they exist
DROP TABLE IF EXISTS releases CASCADE;
DROP TABLE IF EXISTS qc_reports CASCADE;
DROP TABLE IF EXISTS uploads CASCADE;
DROP TABLE IF EXISTS showcase_clips CASCADE;
DROP TABLE IF EXISTS stitching_sessions CASCADE;
DROP TABLE IF EXISTS katha_sessions CASCADE;
DROP TABLE IF EXISTS mixing_sessions CASCADE;
DROP TABLE IF EXISTS track_files CASCADE;
DROP TABLE IF EXISTS recording_sessions CASCADE;
DROP TABLE IF EXISTS shabads CASCADE;
DROP TABLE IF EXISTS artists CASCADE;
DROP TABLE IF EXISTS instruments CASCADE;
DROP TABLE IF EXISTS raags CASCADE;

-- Raags table (traditional Indian musical modes)
CREATE TABLE raags (
    raag_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    thaat VARCHAR(50),
    time_of_day VARCHAR(20),
    mood VARCHAR(100),
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Artists table (performers, engineers, speakers, editors, etc.)
CREATE TABLE artists (
    artist_id VARCHAR(20) PRIMARY KEY, -- e.g., 'artist_101'
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'performer', 'engineer', 'speaker', 'editor', etc.
    specialization VARCHAR(100), -- instrument, expertise area
    contact_info JSONB,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Instruments table
CREATE TABLE instruments (
    instrument_id VARCHAR(20) PRIMARY KEY, -- e.g., 'inst_001'
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50), -- 'percussion', 'string', 'wind', 'vocal'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shabads table (main content)
CREATE TABLE shabads (
    shabad_id VARCHAR(20) PRIMARY KEY, -- e.g., 'shabad_1425'
    title VARCHAR(255) NOT NULL,
    raag_id INTEGER REFERENCES raags(raag_id),
    author VARCHAR(255) NOT NULL,
    page INTEGER,
    status_flag INTEGER DEFAULT 1, -- 1=planned, 2=recording, 3=mixing, 4=stitching, 5=complete
    verses TEXT, -- full text of the shabad
    translation TEXT,
    transliteration TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recording Sessions table
CREATE TABLE recording_sessions (
    session_id VARCHAR(20) PRIMARY KEY, -- e.g., 'rec_001'
    shabad_id VARCHAR(20) REFERENCES shabads(shabad_id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    location VARCHAR(100),
    primary_artist_id VARCHAR(20) REFERENCES artists(artist_id),
    recording_engineer_id VARCHAR(20) REFERENCES artists(artist_id),
    equipment_used JSONB, -- {"mics": ["SM7B", "C414"], "interface": "Apollo Twin", "daw": "Logic Pro X"}
    take_number INTEGER DEFAULT 1,
    file_format_quality VARCHAR(50), -- e.g., "WAV 48kHz/24bit"
    duration INTERVAL, -- e.g., '4 minutes 25 seconds'
    approval_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track Files table (individual audio tracks)
CREATE TABLE track_files (
    track_id VARCHAR(20) PRIMARY KEY, -- e.g., 'track_001'
    session_id VARCHAR(20) REFERENCES recording_sessions(session_id),
    performer_id VARCHAR(20) REFERENCES artists(artist_id),
    instrument_id VARCHAR(20) REFERENCES instruments(instrument_id),
    mic_label VARCHAR(100), -- e.g., "Tabla_Mic1"
    file_path VARCHAR(500) NOT NULL, -- S3 path
    track_duration INTERVAL,
    channel_type VARCHAR(20), -- 'Mono', 'Stereo', 'Left', 'Right'
    file_size BIGINT, -- in bytes
    take_number INTEGER DEFAULT 1,
    notes TEXT,
    approval_status VARCHAR(20) DEFAULT 'pending',
    punch_in_points JSONB, -- [{"start": "02:08", "end": "02:12", "reason": "noise"}]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mixing Sessions table
CREATE TABLE mixing_sessions (
    mix_id VARCHAR(20) PRIMARY KEY, -- e.g., 'mix_001'
    shabad_id VARCHAR(20) REFERENCES shabads(shabad_id),
    audio_engineer_id VARCHAR(20) REFERENCES artists(artist_id),
    start_date DATE NOT NULL,
    end_date DATE,
    daw_project_path VARCHAR(500), -- S3 path to DAW project
    mix_version VARCHAR(10), -- e.g., 'v1.1'
    final_mix_path VARCHAR(500), -- S3 path to final mix
    mp3_preview_path VARCHAR(500), -- S3 path to MP3 preview
    approval_status VARCHAR(20) DEFAULT 'pending',
    mixing_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Katha Sessions table (narration/explanation)
CREATE TABLE katha_sessions (
    katha_id VARCHAR(20) PRIMARY KEY, -- e.g., 'katha_001'
    shabad_id VARCHAR(20) REFERENCES shabads(shabad_id),
    speaker_id VARCHAR(20) REFERENCES artists(artist_id),
    language VARCHAR(50) DEFAULT 'Punjabi',
    duration INTERVAL,
    raw_audio_path VARCHAR(500), -- S3 path
    take_number INTEGER DEFAULT 1,
    translator_id VARCHAR(20) REFERENCES artists(artist_id),
    background_music BOOLEAN DEFAULT FALSE,
    mic_used VARCHAR(100),
    script TEXT, -- what was spoken
    approval_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stitching Sessions table (combining katha + music)
CREATE TABLE stitching_sessions (
    stitch_id VARCHAR(20) PRIMARY KEY, -- e.g., 'stitch_001'
    shabad_id VARCHAR(20) REFERENCES shabads(shabad_id),
    editor_id VARCHAR(20) REFERENCES artists(artist_id),
    mix_version_used VARCHAR(10),
    katha_version_used VARCHAR(20) REFERENCES katha_sessions(katha_id),
    crossfade_duration INTEGER, -- in milliseconds
    volume_notes TEXT, -- e.g., "-3dB on katha"
    final_file_path VARCHAR(500), -- S3 path to final stitched file
    timestamp_marks JSONB, -- [{"time": "02:10", "label": "Katha Insert"}]
    qc_flag BOOLEAN DEFAULT FALSE,
    approval_signature VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Showcase Clips table (preview/promotional clips)
CREATE TABLE showcase_clips (
    clip_id VARCHAR(20) PRIMARY KEY, -- e.g., 'clip_001'
    shabad_id VARCHAR(20) REFERENCES shabads(shabad_id),
    source_file_path VARCHAR(500), -- original file
    clip_file_path VARCHAR(500), -- clipped file
    start_time INTERVAL, -- start point in source
    end_time INTERVAL, -- end point in source
    editor_id VARCHAR(20) REFERENCES artists(artist_id),
    caption_text TEXT,
    approval_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Uploads table (platform publishing)
CREATE TABLE uploads (
    upload_id VARCHAR(20) PRIMARY KEY, -- e.g., 'upl_001'
    shabad_id VARCHAR(20) REFERENCES shabads(shabad_id),
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    platform VARCHAR(50), -- 'YouTube', 'Spotify', etc.
    uploader_id VARCHAR(20) REFERENCES artists(artist_id),
    file_formats TEXT[], -- array of formats uploaded
    cdn_links JSONB, -- {"youtube": "https://youtu.be/...", "spotify": "..."}
    metadata JSONB, -- title, description, tags, etc.
    status VARCHAR(20) DEFAULT 'uploaded', -- 'uploaded', 'published', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- QC Reports table (quality control)
CREATE TABLE qc_reports (
    qc_id VARCHAR(20) PRIMARY KEY, -- e.g., 'qc_001'
    shabad_id VARCHAR(20) REFERENCES shabads(shabad_id),
    qc_user_id VARCHAR(20) REFERENCES artists(artist_id),
    qc_date DATE DEFAULT CURRENT_DATE,
    audio_quality_rating INTEGER CHECK (audio_quality_rating BETWEEN 1 AND 5),
    sync_accuracy VARCHAR(20), -- 'Perfect', 'Good', 'Needs Fix'
    metadata_accuracy VARCHAR(20), -- 'Correct', 'Minor Issues', 'Major Issues'
    defects_found TEXT,
    corrections_applied TEXT,
    re_qc_required BOOLEAN DEFAULT FALSE,
    approval_timestamp TIMESTAMP,
    legal_clearance BOOLEAN DEFAULT FALSE,
    final_approval BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Releases table (final publication)
CREATE TABLE releases (
    release_id VARCHAR(20) PRIMARY KEY, -- e.g., 'rel_001'
    shabad_id VARCHAR(20) REFERENCES shabads(shabad_id),
    live_datetime TIMESTAMP,
    platforms TEXT[], -- array of platforms
    release_type VARCHAR(20), -- 'Single', 'Album', 'EP'
    geo_restrictions TEXT[],
    download_options VARCHAR(50), -- 'Free', 'Paid', 'Subscription'
    license_type VARCHAR(50), -- e.g., 'CC BY-ND 4.0'
    first_24hr_stats JSONB, -- {"views": 1342, "downloads": 410}
    archival_path VARCHAR(500), -- S3 path to archived release
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_shabads_raag ON shabads(raag_id);
CREATE INDEX idx_shabads_status ON shabads(status_flag);
CREATE INDEX idx_recording_sessions_shabad ON recording_sessions(shabad_id);
CREATE INDEX idx_track_files_session ON track_files(session_id);
CREATE INDEX idx_mixing_sessions_shabad ON mixing_sessions(shabad_id);
CREATE INDEX idx_katha_sessions_shabad ON katha_sessions(shabad_id);
CREATE INDEX idx_stitching_sessions_shabad ON stitching_sessions(shabad_id);
CREATE INDEX idx_uploads_platform ON uploads(platform);
CREATE INDEX idx_releases_live_datetime ON releases(live_datetime);

-- Insert traditional raags
INSERT INTO raags (name, thaat, time_of_day, mood, notes) VALUES
('Asavari', 'Asavari', 'Dawn', 'Devotion, longing', 'Associated with dawn prayers'),
('Bhairav', 'Bhairav', 'Early morning', 'Serious, devotional', 'One of the most ancient raags'),
('Ramkali', 'Bhairav', 'Early morning', 'Devotional, serious', 'Used in Anand Sahib'),
('Dhanasri', 'Asavari', 'Evening', 'Peaceful, contemplative', 'Evening contemplation'),
('Gujari', 'Bilaval', 'Morning', 'Joyful, celebratory', 'Morning celebration'),
('Devgandhari', 'Asavari', 'Evening', 'Devotional', 'Evening devotion'),
('Bihagra', 'Bilaval', 'Morning', 'Joy, celebration', 'Morning joy'),
('Vadahans', 'Bilaval', 'Morning', 'Heroic, grand', 'Grand morning raag'),
('Sorath', 'Khamaj', 'Afternoon', 'Romantic, tender', 'Afternoon romance'),
('Dhanasri', 'Asavari', 'Evening', 'Peaceful', 'Evening peace'),
('Jaitsri', 'Khamaj', 'Evening', 'Devotional', 'Evening devotion'),
('Todi', 'Todi', 'Morning', 'Sad, longing', 'Morning pathos'),
('Bairari', 'Bhairav', 'Morning', 'Serious', 'Morning seriousness'),
('Tilang', 'Khamaj', 'Evening', 'Romantic', 'Evening romance'),
('Suhi', 'Todi', 'Evening', 'Longing', 'Evening longing'),
('Bilaval', 'Bilaval', 'Morning', 'Happy, peaceful', 'Morning happiness'),
('Gaund', 'Kalyan', 'Night', 'Grand, majestic', 'Night majesty'),
('Ramkali', 'Bhairav', 'Morning', 'Devotional', 'Morning devotion'),
('Nat Narain', 'Asavari', 'Evening', 'Playful', 'Evening playfulness'),
('Mali Gaura', 'Todi', 'Evening', 'Romantic', 'Evening romance'),
('Maru', 'Todi', 'Afternoon', 'Serious', 'Afternoon contemplation'),
('Tukhari', 'Todi', 'Evening', 'Devotional', 'Evening prayer'),
('Kedara', 'Kalyan', 'Night', 'Romantic', 'Night romance'),
('Bhairon', 'Bhairav', 'Morning', 'Serious', 'Morning gravity'),
('Basant', 'Purvi', 'Spring', 'Joyful', 'Spring celebration'),
('Sarang', 'Khamaj', 'Midday', 'Majestic', 'Midday grandeur'),
('Malkauns', 'Bhairavi', 'Night', 'Deep, meditative', 'Night meditation'),
('Kanara', 'Khamaj', 'Evening', 'Romantic', 'Evening love'),
('Kalyan', 'Kalyan', 'Night', 'Peaceful, devotional', 'Night peace'),
('Prabhati', 'Bhairav', 'Dawn', 'Dawn awakening', 'Dawn prayers'),
('Jaijavanti', 'Khamaj', 'Evening', 'Joyful', 'Evening celebration');

-- Insert sample artists
INSERT INTO artists (artist_id, name, role, specialization) VALUES
('artist_101', 'Bhai Harpreet Singh', 'performer', 'Vocal - Kirtan'),
('artist_102', 'Ustad Rahman Ali', 'performer', 'Tabla'),
('artist_201', 'Jasbir Singh', 'engineer', 'Recording Engineer'),
('artist_202', 'Simran Kaur', 'engineer', 'Audio Engineer'),
('artist_301', 'Giani Kulwant Singh', 'speaker', 'Katha - Punjabi'),
('artist_401', 'Manpreet Singh', 'editor', 'Audio Editing'),
('qc_001', 'Dr. Amarjeet Kaur', 'qc', 'Quality Control'),
('admin_001', 'Jaswinder Singh', 'admin', 'System Administrator');

-- Insert sample instruments
INSERT INTO instruments (instrument_id, name, category) VALUES
('inst_001', 'Tabla', 'percussion'),
('inst_002', 'Harmonium', 'keyboard'),
('inst_003', 'Vocal', 'vocal'),
('inst_004', 'Tanpura', 'string'),
('inst_005', 'Chimta', 'percussion'),
('inst_006', 'Dholak', 'percussion');

-- Insert sample shabad
INSERT INTO shabads (shabad_id, title, raag_id, author, page, status_flag, verses) VALUES
('shabad_1425', 'Anand Sahib', 3, 'Guru Amar Das', 917, 5, 'Anand bhaiaa meree maae satguroo mai paaiaa...');

-- Update function for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_shabads_updated_at BEFORE UPDATE ON shabads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recording_sessions_updated_at BEFORE UPDATE ON recording_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_track_files_updated_at BEFORE UPDATE ON track_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mixing_sessions_updated_at BEFORE UPDATE ON mixing_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_katha_sessions_updated_at BEFORE UPDATE ON katha_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_releases_updated_at BEFORE UPDATE ON releases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();