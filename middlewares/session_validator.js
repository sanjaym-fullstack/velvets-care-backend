const { JWTFunctions } = require("../helpers");

const SessionValidator = async (req, res, required = true) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            throw new Error('Authorization required.')
        }
        const token_data = await JWTFunctions.verifyToken(authHeader);
        
        if (required) {
            req.headers.user = token_data
            return res.continue
        } else {
            return token_data
        }

    } catch (error) {
        console.log(error);
        if (required) {
            return res.response({
                success: false,
                message: error.message,
            }).code(401);
        }
    }
}

module.exports = SessionValidator