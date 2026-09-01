const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Format size function
const formatBytes = (bytes) => {
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    while (bytes >= 1024 && unitIndex < units.length - 1) {
        bytes /= 1024;
        unitIndex++;
    }
    return `${bytes.toFixed(2)} ${units[unitIndex]}`;
};

// Base upload directory
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Create upload directories on startup
const UPLOAD_DIRS = [
    'profile_images',
    'profiles',
    'government_ids',
    'pan_cards',
    'registration_certificates',
    'medical_degree_certificates',
    'products',
    'banners',
    'prescriptions',
    'categories',
    'subcategories',
    'brands',
    'clinic_images',
    'specialization',
    'test'
];

UPLOAD_DIRS.forEach(dir => {
    const dirPath = path.join(UPLOAD_DIR, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

// Get base URL for serving files
// Set BASE_URL in .env for VPS/production (e.g., BASE_URL=http://your-domain.com:3000)
const getBaseUrl = () => {
    if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
    const host = process.env.HOST === '0.0.0.0' ? 'localhost' : (process.env.HOST || 'localhost');
    const port = process.env.PORT || 3000;
    return `http://${host}:${port}`;
};

// Upload file to local storage (replaces uploadFile for S3)
const uploadFile = async (file, store_path = "") => {
    try {
        if (!file) return null;
        const data = await uploadToS3(file.filename, store_path, fs.readFileSync(file.path));
        return {
            file_url: data.key,
            extension: data.key.split('.').pop(),
            original_name: file.filename,
            size: formatBytes(file.size || Buffer.byteLength(fs.readFileSync(file.path)))
        };
    } catch (error) {
        console.error('Local Upload Error:', error);
        throw error;
    }
};

// Delete file from local storage
const deleteFile = async (file_path) => {
    try {
        if (!file_path) {
            return { success: false, message: 'No file path provided' };
        }

        let key = file_path;
        if (file_path.startsWith('/')) key = file_path.slice(1);
        if (file_path.startsWith('http')) {
            const urlParts = new URL(file_path);
            key = decodeURIComponent(urlParts.pathname).slice(1);
        }

        const fullPath = path.join(__dirname, '..', key);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`File deleted locally: ${key}`);
            return { success: true, message: 'File deleted successfully' };
        }
        return { success: false, message: 'File not found' };
    } catch (error) {
        console.error('Local Delete Error:', error);
        return { success: false, message: 'Error deleting file', error };
    }
};

// Get a local URL for the file
function getFileUrl(key, expiresIn = 3600) {
    console.log(key);
    return `${getBaseUrl()}/${key}`;
}

// Delete from local storage by key
const deleteFromS3 = async (key) => {
    try {
        const fullPath = path.join(__dirname, '..', key);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
};

// Upload to local storage (saves file and returns key)
const uploadToS3 = (fileName, filePath, fileData) => {
    return new Promise((resolve, reject) => {
        try {
            const dirPath = path.join(__dirname, '..', filePath);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }

            const key = filePath + '/' + new Date().getTime() + '_' + fileName;
            const fullPath = path.join(__dirname, '..', key);

            fs.writeFileSync(fullPath, fileData);

            resolve({ key });
        } catch (error) {
            console.log(error);
            reject(error);
        }
    });
};

// Get local file URL by key
const getFromS3 = async (key) => {
    try {
        if (key) {
            const fullPath = path.join(__dirname, '..', key);
            if (fs.existsSync(fullPath)) {
                return `${getBaseUrl()}/${key}`;
            }
            return null;
        }
        return null;
    } catch (error) {
        console.log(error);
        return null;
    }
};

// Get multiple local file URLs
const getFromS3Multiple = async (arrayData) => {
    try {
        let returnImages = [];
        for (let a of JSON.parse(arrayData)) {
            returnImages.push(await getFromS3(a));
        }
        return returnImages;
    } catch (error) {
        console.log(error);
        return null;
    }
};

module.exports = {
    uploadFile,
    deleteFile,
    deleteFromS3,
    getFileUrl,
    uploadToS3,
    getFromS3,
};
