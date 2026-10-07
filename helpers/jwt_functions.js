const jwt = require('jsonwebtoken');
require('dotenv/config')
const generateToken = (payload, expiresIn = '1h') => {
    const secretKey = process.env.JWT_SECRET_KEY;
    return jwt.sign(payload, secretKey, { expiresIn });
};


const verifyToken = (token, ret = false) => {
    try {
        const secretKey = process.env.JWT_SECRET_KEY;
        return jwt.verify(token, secretKey);
    } catch (error) {
        if (ret == true) return false;
        throw new Error('Invalid or expired token');
    }
};

// Finds the refresh token wherever the client was able to send it.
//
// The `refresh_token` header name contains an underscore, and nginx drops
// underscore-named request headers by default (`underscores_in_headers off`),
// so behind that proxy the header never reaches the app. Accept the hyphen
// spelling and the JSON body as well so the endpoint keeps working either way.
const readRefreshToken = (req) => {
    const headers = (req && req.headers) || {};
    const sources = [
        headers.refresh_token,
        headers['refresh-token'],
        req && req.query ? req.query.refresh_token : undefined,
        req && req.payload && typeof req.payload === 'object' ? req.payload.refresh_token : undefined,
    ];

    for (const source of sources) {
        if (typeof source === 'string' && source.trim()) return source.trim();
    }
    return '';
};


module.exports = {
    generateToken,
    verifyToken,
    readRefreshToken
}