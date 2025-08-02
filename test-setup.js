#!/usr/bin/env node

// Test Setup Script - Run this to set up the system for testing
const fs = require('fs');
const path = require('path');

console.log('🎵 Setting up Raag Recording System for Testing...\n');

// Create test environment file
if (!fs.existsSync('.env')) {
    console.log('📝 Creating .env file for testing...');
    fs.copyFileSync('.env.test', '.env');
    console.log('✅ Created .env file (using local storage, no AWS required)\n');
}

// Create directories for local storage
const directories = [
    'local_storage',
    'local_storage/raw-tracks',
    'local_storage/mixed-tracks', 
    'local_storage/narrator-recordings',
    'local_storage/final-compositions',
    'temp_uploads'
];

console.log('📁 Creating storage directories...');
directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created ${dir}`);
    }
});

// Create a simple in-memory database setup for testing
console.log('\n💾 Setting up test database...');

const testData = {
    users: [
        { id: 1, username: 'performer1', full_name: 'Test Performer', role: 'performer', email: 'performer@test.com' },
        { id: 2, username: 'approver1', full_name: 'Test Approver', role: 'approver', email: 'approver@test.com' },
        { id: 3, username: 'mixer1', full_name: 'Test Mixer', role: 'mixer', email: 'mixer@test.com' },
        { id: 4, username: 'narrator1', full_name: 'Test Narrator', role: 'narrator', email: 'narrator@test.com' }
    ],
    raags: [
        { id: 1, name: 'Asa', thaat: 'Bilawal', description: 'Morning raag, evokes hope and aspiration' },
        { id: 2, name: 'Gujari', thaat: 'Bhairav', description: 'Morning raag, peaceful and devotional' },
        { id: 3, name: 'Sorath', thaat: 'Khamaj', description: 'Afternoon raag, gentle and soothing' }
    ],
    shabads: [
        { 
            id: 1, 
            ang_number: 1, 
            shabad_number: 1, 
            raag_id: 1, 
            guru_author: 'Guru Nanak Dev Ji',
            first_line: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ',
            full_text: 'Complete shabad text would go here...',
            translation_english: 'There is One God, Truth is His Name...'
        },
        { 
            id: 2, 
            ang_number: 2, 
            shabad_number: 1, 
            raag_id: 2, 
            guru_author: 'Guru Nanak Dev Ji',
            first_line: 'ਸੋਚੈ ਸੋਚਿ ਨ ਹੋਵਈ',
            full_text: 'Complete shabad text would go here...',
            translation_english: 'By thinking, one cannot comprehend Him...'
        }
    ]
};

// Write test data to JSON files for simple file-based database
fs.writeFileSync('test_data.json', JSON.stringify(testData, null, 2));
console.log('✅ Created test database with sample data\n');

// Create sample audio files for testing (empty files)
console.log('🎵 Creating sample audio files for testing...');
const sampleAudioDir = 'sample_audio';
if (!fs.existsSync(sampleAudioDir)) {
    fs.mkdirSync(sampleAudioDir);
}

// Create empty audio files for testing upload functionality
const sampleFiles = [
    'sample_vocal.wav',
    'sample_tabla.wav', 
    'sample_harmonium.wav'
];

sampleFiles.forEach(file => {
    const filePath = path.join(sampleAudioDir, file);
    if (!fs.existsSync(filePath)) {
        // Create a minimal WAV file header for testing
        const wavHeader = Buffer.from([
            0x52, 0x49, 0x46, 0x46, // "RIFF"
            0x24, 0x00, 0x00, 0x00, // File size
            0x57, 0x41, 0x56, 0x45, // "WAVE"
            0x66, 0x6D, 0x74, 0x20, // "fmt "
            0x10, 0x00, 0x00, 0x00, // Subchunk1Size
            0x01, 0x00,             // AudioFormat (PCM)
            0x01, 0x00,             // NumChannels (mono)
            0x44, 0xAC, 0x00, 0x00, // SampleRate (44100)
            0x88, 0x58, 0x01, 0x00, // ByteRate
            0x02, 0x00,             // BlockAlign
            0x10, 0x00,             // BitsPerSample (16)
            0x64, 0x61, 0x74, 0x61, // "data"
            0x00, 0x00, 0x00, 0x00  // Subchunk2Size
        ]);
        fs.writeFileSync(filePath, wavHeader);
        console.log(`✅ Created sample file: ${file}`);
    }
});

console.log('\n🚀 Test setup complete!\n');

console.log('To start the application in test mode:');
console.log('1. npm install');
console.log('2. npm run test-server\n');

console.log('Or run the server with:');
console.log('node server.js\n');

console.log('Then open: http://localhost:3000\n');

console.log('Test login credentials:');
console.log('- Username: performer1, Role: performer');
console.log('- Username: approver1, Role: approver'); 
console.log('- Username: mixer1, Role: mixer');
console.log('- Username: narrator1, Role: narrator\n');

console.log('📁 Sample audio files for testing uploads:');
console.log('- sample_audio/sample_vocal.wav');
console.log('- sample_audio/sample_tabla.wav');
console.log('- sample_audio/sample_harmonium.wav\n');

console.log('🎯 The system will use local file storage instead of S3');
console.log('📊 Test data is stored in test_data.json');
console.log('🔧 All uploaded files go to ./local_storage/\n');

console.log('Happy testing! 🎵');