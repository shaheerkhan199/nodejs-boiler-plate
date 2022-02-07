const Response = require("../utils/Response");
const { userRole } = require("../startup/constants");

module.exports = function (req, res, next) {
  const isAdmin = req.user.data.roleId
  if (isAdmin == userRole) return res.status(403).send(Response.failure(403, "Forbidden!! You don't have permissions to access this URL."))
  next()
}