-- Add comprehensive test data for Raag Recording System

-- First, let's add some sample shabads
INSERT INTO shabads (shabad_id, title, raag_id, author, page, status_flag, verses, translation, transliteration) VALUES
('shabad_0001', 'Japji Sahib - Mool Mantar', 1, 'Guru Nanak Dev Ji', 1, 2, 
 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ ਨਿਰਵੈਰੁ ਅਕਾਲ ਮੂਰਤਿ ਅਜੂਨੀ ਸੈਭੰ ਗੁਰ ਪ੍ਰਸਾਦਿ ॥',
 'One Universal Creator God. The Name Is Truth. Creative Being Personified. No Fear. No Hatred. Image Of The Undying, Beyond Birth, Self-Existent. By Guru''s Grace.',
 'Ik Onkar Sat Naam Karta Purkh Nirbhau Nirvair Akaal Moorat Ajuni Saibhang Gur Prasaad'),

('shabad_0002', 'Anand Sahib - Opening', 3, 'Guru Amar Das Ji', 917, 3,
 'ਅਨੰਦੁ ਭਇਆ ਮੇਰੀ ਮਾਏ ਸਤਿਗੁਰੂ ਮੈ ਪਾਇਆ ॥ ਸਤਿਗੁਰੁ ਤ ਪਾਇਆ ਸਹਜ ਸੇਤੀ ਮਨਿ ਵਜੀਆ ਵਾਧਾਈਆ ॥',
 'I am in ecstasy, O my mother, for I have found my True Guru. I have found the True Guru, with intuitive ease, and my mind vibrates with the music of bliss.',
 'Anand Bhaiaa Meri Maae Satiguru Mai Paaiaa'),

('shabad_0003', 'So Dar Keha', 2, 'Guru Nanak Dev Ji', 8, 1,
 'ਸੋ ਦਰੁ ਕੇਹਾ ਸੋ ਘਰੁ ਕੇਹਾ ਜਿਤੁ ਬਹਿ ਸਰਬ ਸਮਾਲੇ ॥',
 'Where is that Gate, and where is that Dwelling, in which You sit and take care of all?',
 'So Dar Keha So Ghar Keha Jit Bahi Sarab Samaaley'),

('shabad_0004', 'Kirtan Sohila', 1, 'Guru Nanak Dev Ji', 12, 4,
 'ਸਲੋਕੁ ॥ ਗਗਨ ਮੈ ਥਾਲੁ ਰਵਿ ਚੰਦੁ ਦੀਪਕ ਬਨੇ ਤਾਰਿਕਾ ਮੰਡਲ ਜਨਕ ਮੋਤੀ ॥',
 'Upon that cosmic plate of the sky, the sun and the moon are the lamps. The stars and their orbs are the studded pearls.',
 'Gagan Mai Thaal Rav Chand Deepak Baney Taarikaa Mandal Janak Moti');

-- Add some artists with different specializations
INSERT INTO artists (artist_id, name, role, specialization, contact_info, bio) VALUES
('artist_201', 'Bhai Hardeep Singh', 'performer', 'Vocal - Classical Kirtan', 
 '{"phone": "+91-9876543210", "email": "hardeep@raagrecording.com"}',
 'Classical kirtan singer with 15 years experience in traditional Sikh music'),

('artist_202', 'Bibi Simran Kaur', 'performer', 'Vocal - Devotional', 
 '{"phone": "+91-9876543211", "email": "simran@raagrecording.com"}',
 'Devotional singer specializing in Gurbani kirtan'),

('artist_301', 'Ustad Ravinder Singh', 'performer', 'Tabla', 
 '{"phone": "+91-9876543212", "email": "ravinder@raagrecording.com"}',
 'Master tabla player trained in Punjabi and Hindustani classical traditions'),

('artist_302', 'Harpreet Singh', 'performer', 'Harmonium', 
 '{"phone": "+91-9876543213", "email": "harpreet@raagrecording.com"}',
 'Expert harmonium player for kirtan accompaniment'),

('artist_401', 'Jasbir Singh', 'engineer', 'Recording Engineer', 
 '{"phone": "+91-9876543214", "email": "jasbir@raagrecording.com"}',
 'Professional audio engineer with studio experience'),

('artist_501', 'Giani Kulwant Singh', 'speaker', 'Katha', 
 '{"phone": "+91-9876543215", "email": "kulwant@raagrecording.com"}',
 'Scholar and katha speaker explaining Gurbani meanings');

-- Add some recording sessions
INSERT INTO recording_sessions (session_id, shabad_id, start_time, end_time, location, primary_artist_id, recording_engineer_id, equipment_used, take_number, file_format_quality, duration, approval_status, notes) VALUES
('rec_001', 'shabad_0001', '2025-01-15 10:00:00', '2025-01-15 11:30:00', 'Studio A', 'artist_201', 'artist_401',
 '{"mics": ["SM7B", "C414"], "interface": "Apollo Twin", "daw": "Logic Pro X", "preamps": ["Neve 1073"]}',
 2, 'WAV 48kHz/24bit', '00:04:25', 'approved', 'Excellent vocal performance, minor harmonium adjustment needed'),

('rec_002', 'shabad_0002', '2025-01-16 14:00:00', '2025-01-16 16:15:00', 'Studio A', 'artist_202', 'artist_401',
 '{"mics": ["SM7B", "C414", "AKG414"], "interface": "Apollo Twin", "daw": "Logic Pro X"}',
 1, 'WAV 48kHz/24bit', '00:06:12', 'pending', 'First take, needs review for timing'),

('rec_003', 'shabad_0003', '2025-01-18 09:00:00', '2025-01-18 10:45:00', 'Studio B', 'artist_201', 'artist_401',
 '{"mics": ["SM7B"], "interface": "Focusrite", "daw": "Pro Tools"}',
 3, 'WAV 48kHz/24bit', '00:03:45', 'approved', 'Perfect take after minor adjustments');

-- Add some track files
INSERT INTO track_files (track_id, session_id, performer_id, instrument_id, mic_label, file_path, track_duration, channel_type, file_size, take_number, notes, approval_status, punch_in_points) VALUES
('track_001', 'rec_001', 'artist_201', 'inst_001', 'Vocal_Main', 's3://bucket/tracks/track_001_vocal.wav', '00:04:25', 'Mono', 47200000, 2, 'Clear vocal, excellent pitch', 'approved', '[]'),
('track_002', 'rec_001', 'artist_302', 'inst_002', 'Harmonium_L', 's3://bucket/tracks/track_002_harmonium.wav', '00:04:25', 'Stereo', 94400000, 2, 'Good harmonium support', 'approved', '[]'),
('track_003', 'rec_001', 'artist_301', 'inst_003', 'Tabla_Close', 's3://bucket/tracks/track_003_tabla.wav', '00:04:25', 'Mono', 47200000, 2, 'Tight rhythm, perfect sync', 'approved', '[{"start": "02:10", "end": "02:15", "reason": "tempo adjustment"}]'),

('track_004', 'rec_002', 'artist_202', 'inst_001', 'Vocal_Main', 's3://bucket/tracks/track_004_vocal.wav', '00:06:12', 'Mono', 66240000, 1, 'Strong performance, minor timing issue at 3:20', 'pending', '[{"start": "03:18", "end": "03:25", "reason": "timing correction needed"}]');

-- Add some mixing sessions
INSERT INTO mixing_sessions (mix_id, shabad_id, audio_engineer_id, start_date, end_date, daw_project_path, mix_version, final_mix_path, mp3_preview_path, approval_status, notes) VALUES
('mix_001', 'shabad_0001', 'artist_401', '2025-01-20', '2025-01-22', 's3://bucket/projects/shabad_0001_mix.logicx', 'v1.2', 's3://bucket/final/shabad_0001_final.wav', 's3://bucket/preview/shabad_0001_preview.mp3', 'approved', 'Final mix completed, excellent balance'),
('mix_002', 'shabad_0003', 'artist_401', '2025-01-25', NULL, 's3://bucket/projects/shabad_0003_mix.logicx', 'v0.8', NULL, 's3://bucket/preview/shabad_0003_wip.mp3', 'pending', 'Work in progress, vocals need more presence');

-- Add some katha sessions
INSERT INTO katha_sessions (katha_id, shabad_id, speaker_id, language, duration, raw_audio_path, take_number, translator_id, background_music, mic_used, notes) VALUES
('katha_001', 'shabad_0001', 'artist_501', 'Punjabi', '00:03:00', 's3://bucket/katha/katha_001.wav', 1, NULL, 'Yes', 'RE20', 'Clear explanation of Mool Mantar significance'),
('katha_002', 'shabad_0002', 'artist_501', 'Punjabi', '00:04:30', 's3://bucket/katha/katha_002.wav', 2, NULL, 'Yes', 'RE20', 'Second take - better pacing and clarity');

-- Add some QC reports
INSERT INTO qc_reports (qc_id, shabad_id, qc_user_id, qc_date, audio_quality_rating, sync_accuracy, metadata_accuracy, defects_found, corrections_applied, re_qc_required, approval_timestamp, legal_clearance, notes) VALUES
('qc_001', 'shabad_0001', 6, '2025-01-23', 5, 'Perfect', 'Correct', 'None', NULL, 'No', '2025-01-23 16:00:00', 'Yes', 'Excellent quality, ready for release'),
('qc_002', 'shabad_0003', 6, '2025-01-26', 4, 'Good', 'Correct', 'Minor background noise at 1:20', 'Noise reduction applied', 'No', '2025-01-26 14:30:00', 'Yes', 'Good quality after noise correction');

-- Add some releases
INSERT INTO releases (release_id, shabad_id, live_datetime, platforms, release_type, geo_restrictions, download_options, license_type, first_24hr_stats, archival_path, notes) VALUES
('rel_001', 'shabad_0001', '2025-02-01 08:00:00', 'YouTube,Spotify,SoundCloud', 'Single', NULL, 'Free', 'CC BY-ND 4.0', '2341 views, 567 downloads', 's3://archive/shabad_0001_release.zip', 'Successful release, good engagement'),
('rel_002', 'shabad_0003', '2025-02-05 08:00:00', 'YouTube,Spotify', 'Single', NULL, 'Free', 'CC BY-ND 4.0', '1876 views, 432 downloads', 's3://archive/shabad_0003_release.zip', 'Good response from community');

-- Update some shabad status flags based on progress
UPDATE shabads SET status_flag = 5 WHERE shabad_id IN ('shabad_0001', 'shabad_0003'); -- Completed
UPDATE shabads SET status_flag = 4 WHERE shabad_id = 'shabad_0002'; -- In stitching phase

-- Add some user activity
UPDATE users SET last_login = '2025-01-30 09:15:00' WHERE username = 'performer1';
UPDATE users SET last_login = '2025-01-29 14:20:00' WHERE username = 'approver1';
UPDATE users SET last_login = '2025-01-30 11:45:00' WHERE username = 'mixer1';

COMMIT;