const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const fs = require('fs');

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

// AWS S3 Configuration
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Upload file to S3 (delegates to uploadToS3)
const uploadFile = async (file, store_path = "") => {
    try {
        if (!file) return null;
        const data = await uploadToS3(file.filename, store_path, fs.readFileSync(file.path));
        return {
            file_url: data.Location || `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${data.Key}`,
            extension: data.Key.split('.').pop(),
            original_name: file.filename,
            size: formatBytes(file.size || Buffer.byteLength(fs.readFileSync(file.path)))
        };
    } catch (error) {
        console.error('S3 Upload Error:', error);
        throw error;
    }
};

// Delete file from S3
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

        const params = {
            Bucket: BUCKET_NAME,
            Key: key
        };

        await s3.deleteObject(params).promise();
        console.log(`File deleted from S3: ${key}`);
        return { success: true, message: 'File deleted successfully' };
    } catch (error) {
        console.error('S3 Delete Error:', error);
        return { success: false, message: 'Error deleting file', error };
    }
};

// Get a signed URL (useful for private buckets)
function getFileUrl(key, expiresIn = 3600) {
    console.log(key);

    return s3.getSignedUrl('getObject', {
        Bucket: BUCKET_NAME,
        Key: key,
        Expires: expiresIn // in seconds (default 1 hour)
    });
}


const deleteFromS3 = async (key) => {
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Key: key,
        };
        await s3.deleteObject(params).promise()
        return true
    } catch (error) {
        return false
    }
}

const uploadToS3 = (fileName, filePath, fileData) => {
    return new Promise((resolve, reject) => {
        const params = {
            Bucket: BUCKET_NAME,
            Key: filePath + '/' + new Date().getTime() + '_' + fileName,
            Body: fileData,
        };
        s3.upload(params, (err, data) => {
            if (err) {
                console.log(err);
                return reject(err);
            }
            return resolve(data);
        });
    });
};

const getFromS3 = async (key) => {
    try {
        if (key) {
            const params = {
                Bucket: BUCKET_NAME,
                Key: key,
                // SignatureVersion: 'v4',
            };
            const data = s3.getSignedUrl('getObject', params);
            return data
        }
        return null;
    } catch (error) {
        console.log(error);
        return null
    }
}

const getFromS3Multiple = async (arrayData) => {
    try {
        let returnImages = [];
        for (let a of JSON.parse(arrayData)) {
            returnImages.push(await getFromS3(a));
        }
        return returnImages;
    } catch (error) {
        console.log(error);
        return null
    }
}


module.exports = {
    uploadFile,
    deleteFile,
    getFileUrl,
    uploadToS3,
    getFromS3,
};
