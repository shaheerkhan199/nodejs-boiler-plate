const jwt = require("jsonwebtoken")
const {
  inActive
} = require("../startup/constants")
const Model = require("../models")
const Response = require("../utils/Response");
module.exports = async function (req, res, next) {
  try {
    const user = await Model.users.findOne({
      raw: true,
      where: {
        id: req.user.data.id
      }
    })
    if (user.status == inActive) return res.status(401).send(Response.failure(401, "Your account has been de-activated by the admin. Please contact at support@tickfilm.com for further query."))
    next()
  } catch (ex) {
    res.status(401).send(Response.failure(401, "Invalid token"))
  }
}