const { JWTFunctions } = require("../helpers");

const SessionValidator = async (req, res, required = true) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            throw new Error('Authorization required.')
        }
        const token_data = await JWTFunctions.verifyToken(authHeader);

        // Tokens minted before the role fix (user verify/refresh and doctor
        // refresh) carry no `role`. Derive it from the payload shape so
        // role-based logic (e.g. notifications) keeps working for sessions
        // that were issued before this deploy.
        if (token_data && !token_data.role) {
            if (token_data.user_id !== undefined) token_data.role = 'USER';
            else if (token_data.doctor_id !== undefined) token_data.role = 'DOCTOR';
        }

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