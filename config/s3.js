const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS SDK
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

const S3_CONFIG = {
    bucket: process.env.S3_BUCKET,
    prefixes: {
        rawTracks: process.env.S3_RAW_TRACKS_PREFIX || 'raw-tracks/',
        mixedTracks: process.env.S3_MIXED_TRACKS_PREFIX || 'mixed-tracks/',
        narratorRecordings: process.env.S3_NARRATOR_PREFIX || 'narrator-recordings/',
        finalCompositions: process.env.S3_FINAL_PREFIX || 'final-compositions/'
    }
};

/**
 * Generate S3 key based on file type and metadata
 */
function generateS3Key(fileType, metadata) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    switch (fileType) {
        case 'raw_track':
            return `${S3_CONFIG.prefixes.rawTracks}${metadata.shabadId}/${metadata.sessionId}/track-${metadata.trackNumber}-${metadata.performer}-${timestamp}.${metadata.extension}`;
        
        case 'mixed_track':
            return `${S3_CONFIG.prefixes.mixedTracks}${metadata.shabadId}/session-${metadata.sessionId}-v${metadata.version}-${timestamp}.${metadata.extension}`;
        
        case 'narrator_recording':
            return `${S3_CONFIG.prefixes.narratorRecordings}${metadata.shabadId}/narrator-${metadata.narratorId}-${timestamp}.${metadata.extension}`;
        
        case 'final_composition':
            return `${S3_CONFIG.prefixes.finalCompositions}${metadata.shabadId}/final-v${metadata.version}-${timestamp}.${metadata.extension}`;
        
        default:
            return `uploads/${timestamp}-${metadata.filename}`;
    }
}

/**
 * Upload file to S3
 */
async function uploadToS3(fileBuffer, key, contentType = 'audio/wav', metadata = {}) {
    try {
        const params = {
            Bucket: S3_CONFIG.bucket,
            Key: key,
            Body: fileBuffer,
            ContentType: contentType,
            Metadata: {
                ...metadata,
                uploadedAt: new Date().toISOString()
            },
            // Enable server-side encryption
            ServerSideEncryption: 'AES256'
        };

        const result = await s3.upload(params).promise();
        return {
            success: true,
            location: result.Location,
            key: result.Key,
            etag: result.ETag
        };
    } catch (error) {
        console.error('S3 upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generate presigned URL for file access
 */
async function getPresignedUrl(key, expireSeconds = 3600) {
    try {
        const params = {
            Bucket: S3_CONFIG.bucket,
            Key: key,
            Expires: expireSeconds
        };

        const url = await s3.getSignedUrlPromise('getObject', params);
        return { success: true, url };
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete file from S3
 */
async function deleteFromS3(key) {
    try {
        const params = {
            Bucket: S3_CONFIG.bucket,
            Key: key
        };

        await s3.deleteObject(params).promise();
        return { success: true };
    } catch (error) {
        console.error('S3 delete error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get file metadata from S3
 */
async function getFileMetadata(key) {
    try {
        const params = {
            Bucket: S3_CONFIG.bucket,
            Key: key
        };

        const result = await s3.headObject(params).promise();
        return {
            success: true,
            metadata: result.Metadata,
            size: result.ContentLength,
            lastModified: result.LastModified,
            contentType: result.ContentType
        };
    } catch (error) {
        console.error('Error getting file metadata:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    s3,
    S3_CONFIG,
    generateS3Key,
    uploadToS3,
    getPresignedUrl,
    deleteFromS3,
    getFileMetadata
};