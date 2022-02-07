const jwt = require("jsonwebtoken")
const {
    jwtPrivateKey
} = require("../startup/config")
const Response = require("../utils/Response");
module.exports = function (req, res, next) {
    const token = req.header('x-auth-token')
    if (!token) return res.status(401).send(Response.failure(401, "Access denied no token provided"))
    try {
        const decoded = jwt.verify(token, jwtPrivateKey);
        req.user = decoded
        next()
    } catch (ex) {
        res.status(401).send(Response.failure(401, "Invalid code"))
    }
}