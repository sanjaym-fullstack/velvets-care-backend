const {
    uploadToS3,
    getFromS3
} = require('../helpers/file_functions')
const fs = require('fs')


const uploadFileFunc = async (req, res) => {
    try {
        const { file } = req.payload
        const resp = await uploadToS3(file.filename, 'test', fs.readFileSync(file.path))
        return {
            success: true,
            data: resp
        }
    } catch (err) {
        console.error(err);
        return h.response({
            success: false,
            message: err.message || 'Something went wrong'
        }).code(200);
    }
}


const getFile = async (req, res) => {
    try {
        const { path } = req.payload
        return {
            success: true,
            data: await getFromS3(path)
        }
    } catch (err) {
        console.error(err);
        return h.response({
            success: false,
            message: err.message || 'Something went wrong'
        }).code(200);
    }
}


module.exports = {
    uploadFileFunc,
    getFile
}