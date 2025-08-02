const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Local storage configuration for testing without AWS
const LOCAL_STORAGE = {
    basePath: path.join(__dirname, '..', 'local_storage'),
    prefixes: {
        rawTracks: 'raw-tracks/',
        mixedTracks: 'mixed-tracks/',
        narratorRecordings: 'narrator-recordings/',
        finalCompositions: 'final-compositions/'
    }
};

// Ensure storage directories exist
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Initialize local storage directories
function initializeLocalStorage() {
    ensureDirectoryExists(LOCAL_STORAGE.basePath);
    Object.values(LOCAL_STORAGE.prefixes).forEach(prefix => {
        ensureDirectoryExists(path.join(LOCAL_STORAGE.basePath, prefix));
    });
}

/**
 * Generate local file path based on file type and metadata
 */
function generateLocalPath(fileType, metadata) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${metadata.filename || 'file'}-${timestamp}.${metadata.extension}`;
    
    switch (fileType) {
        case 'raw_track':
            const trackDir = path.join(LOCAL_STORAGE.basePath, LOCAL_STORAGE.prefixes.rawTracks, 
                                     `shabad-${metadata.shabadId}`, `session-${metadata.sessionId}`);
            ensureDirectoryExists(trackDir);
            return path.join(trackDir, `track-${metadata.trackNumber}-${metadata.performer}-${fileName}`);
        
        case 'mixed_track':
            const mixedDir = path.join(LOCAL_STORAGE.basePath, LOCAL_STORAGE.prefixes.mixedTracks, 
                                     `shabad-${metadata.shabadId}`);
            ensureDirectoryExists(mixedDir);
            return path.join(mixedDir, `session-${metadata.sessionId}-v${metadata.version}-${fileName}`);
        
        case 'narrator_recording':
            const narratorDir = path.join(LOCAL_STORAGE.basePath, LOCAL_STORAGE.prefixes.narratorRecordings, 
                                        `shabad-${metadata.shabadId}`);
            ensureDirectoryExists(narratorDir);
            return path.join(narratorDir, `narrator-${metadata.narratorId}-${fileName}`);
        
        case 'final_composition':
            const finalDir = path.join(LOCAL_STORAGE.basePath, LOCAL_STORAGE.prefixes.finalCompositions, 
                                     `shabad-${metadata.shabadId}`);
            ensureDirectoryExists(finalDir);
            return path.join(finalDir, `final-v${metadata.version}-${fileName}`);
        
        default:
            return path.join(LOCAL_STORAGE.basePath, 'uploads', fileName);
    }
}

/**
 * Save file to local storage
 */
async function saveToLocal(fileBuffer, filePath, metadata = {}) {
    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        ensureDirectoryExists(dir);
        
        // Write file
        fs.writeFileSync(filePath, fileBuffer);
        
        // Generate a unique ID for the file (simulating S3 key)
        const fileId = uuidv4();
        
        return {
            success: true,
            location: filePath,
            key: fileId,
            localPath: filePath
        };
    } catch (error) {
        console.error('Local storage error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generate local file URL (for serving files)
 */
function getLocalFileUrl(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            // Return relative URL that can be served by Express
            const relativePath = path.relative(LOCAL_STORAGE.basePath, filePath);
            return {
                success: true,
                url: `/local-files/${relativePath.replace(/\\/g, '/')}`
            };
        } else {
            return {
                success: false,
                error: 'File not found'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Delete file from local storage
 */
function deleteFromLocal(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return { success: true };
    } catch (error) {
        console.error('Error deleting local file:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get file metadata from local storage
 */
function getLocalFileMetadata(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            return {
                success: true,
                size: stats.size,
                lastModified: stats.mtime,
                path: filePath
            };
        } else {
            return {
                success: false,
                error: 'File not found'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    LOCAL_STORAGE,
    initializeLocalStorage,
    generateLocalPath,
    saveToLocal,
    getLocalFileUrl,
    deleteFromLocal,
    getLocalFileMetadata
};