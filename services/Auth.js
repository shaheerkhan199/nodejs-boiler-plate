const moment = require("moment")
const Model = require("../models")
const bcryptjs = require("bcryptjs")
const jwt = require("jsonwebtoken")
const Sequelize = require("sequelize");
const Response = require("../utils/Response");
const {
  jwtPrivateKey
} = require("../startup/config")
const {
  active,
  inActive,
  unverified,
} = require("../startup/constants")
class AuthService {
  /**
   * This function is used to signup a user
   * @param {object} req 
   */
  async socialSignup(req, imagePath, imageThumbPath, t) {
    const salt = await bcryptjs.genSalt(10)
    const hashed = await bcryptjs.hash(req.body.password, salt)
    try {
      const userRecord = await Model.users.create({
        roleId: 1,
        userName: req.body.userName,
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        imageUrl: imagePath,
        imageThumbUrl: imageThumbPath,
        password: hashed,
        status: req.body.status,
      }, {
        transaction: t
      })
      const token = this.generateJWT(userRecord);
      return {
        user: {
          id: userRecord.id,
          roleId: userRecord.roleId,
          firstName: userRecord.firstName,
          lastName: userRecord.lastName,
          email: userRecord.email,
          imageUrl: userRecord.imageUrl,
          imageThumbUrl: userRecord.imageThumbUrl,
          status: userRecord.status
        },
        token,
        success: true,
      }
    } catch (ex) {
      return {
        success: false,
        error: `Error occured while creating account reason: ${ex}`
      }
    }
  }

  async signup(req, t) {
    try {
      const userRecord = await Model.users.create({
        roleId: 1,
        email: req.body.email,
        status: req.body.status,
      }, {
        transaction: t
      })
      return {
        user: {
          id: userRecord.id,
          roleId: userRecord.roleId,
          email: userRecord.email,
          status: userRecord.status
        },
        success: true,
      }
    } catch (ex) {
      return {
        success: false,
        error: `Error occured while creating account reason: ${ex}`
      }
    }
  }
  async finishSignup(req, imagePath, imageThumbPath) {
    // check whether email or id is of correct record
    const userRecord = await Model.users.findOne({
      where: {
        [Sequelize.Op.and]: [
          { id: req.params.id },
          { email: req.body.email }
        ]
      }
    })
    if (!userRecord) return {
      code: 400,
      success: false,
      error: "User not found"
    }
    const salt = await bcryptjs.genSalt(10)
    const hashed = await bcryptjs.hash(req.body.password, salt)
    try {
      const userRecord = await Model.users.update({
        roleId: 1,
        userName: req.body.userName,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        imageUrl: imagePath,
        imageThumbUrl: imageThumbPath,
        password: hashed,
        status: active
      }, {
        where: {
          [Sequelize.Op.and]: [
            { id: req.params.id },
            { email: req.body.email }
          ]
        }
      })
      return {
        user: {
          id: req.params.id,
          roleId: 1,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          email: req.body.email,
          imageUrl: imagePath,
          imageThumbUrl: imageThumbPath,
          // status: userRecord.status
        },
        success: true,
      }
    } catch (ex) {
      return {
        success: false,
        error: `Error occured while creating account reason: ${ex}`
      }
    }
  }
  /**
  * This controller is use to contact admin
  * @param {object} req 
  * @param {object} res 
  */
  async loginResponse(users, res) {
    if (users.user.status == inActive) return res.status(400).send(Response.success(400, {
      success: false,
      error: "Your account has been de-activated by the admin. Please contact at support@tickfilm.com for further query."
    }))
    if (users.user.status == unverified) return res.status(400).send(Response.success(400, {
      success: false,
      error: "Your Account is not active"
    }))
    const token = this.generateJWT(users.user)

    var role = (users.user.roleId == 2) ? "admin" : "user";
    return res.status(200)
      .header("x-auth-token", token)
      .send(Response.success(200, {
        message: "Logged in successfully",
        user: {
          id: users.user.id,
          roleId: role,
          userName: users.user.userName,
          email: users.user.email,
          firstName: users.user.firstName,
          lastName: users.user.lastName,
          image: users.user.imageUrl,
          enableNotifications: users.user.enableNotifications
        },
        x_auth_token: token
      }));
  }
  /**
   * This function is used to login a user
   * @param {string} email 
   * @param {string} password 
   */
  async login(email, password) {
    try {
      const userRecord = await Model.users.findOne({
        where: {
          email: email
        }
      })
      if (userRecord.status === unverified) {
        return {
          code: 400,
          success: false,
          error: "Please complete your signup first."
        }
      }
      if (!userRecord) return {
        code: 400,
        success: false,
        error: "That’s weird… This user does not exist."
      }
      const correctPassword = await bcryptjs.compare(password, userRecord.password)
      if (!correctPassword) return {
        code: 400,
        success: false,
        error: "Incorrect password"
      }
      return {
        success: true,
        user: {
          id: userRecord.id,
          roleId: userRecord.roleId,
          firstName: userRecord.firstName,
          lastName: userRecord.lastName,
          email: userRecord.email,
          userName: userRecord.userName,
          imageUrl: userRecord.imageUrl,
          imageThumbUrl: userRecord.imageThumbUrl,
          status: userRecord.status,
          enableNotifications: userRecord.enableNotifications // for admin pannel only
        }
      }
    } catch (e) {
      return {
        success: false,
        error: "Something went wrong. Please try to log in again."
      }
    }
  }
  async updateUserDevice(req) {
    try {
      const userUpdate = await Model.users.update({
        deviceToken: req.body.deviceToken
      }, {
        where: {
          id: req.body.id
        }
      })

      return {
        user: userUpdate,
        success: true,
      }
    } catch (ex) {

      return {
        success: false,
        error: `Error occured while edit user reason: ${ex}`
      }
    }
  }
  // async changePassword(){
  //   try{
  //     const userRecord = await Model.users.findOne({
  //       where: {
  //         email: email
  //       }
  //     })
  //     const correctPassword = await bcryptjs.compare(password, userRecord.password)
  //     if (!correctPassword) return {
  //       code: 400,
  //       success: false,
  //       error: "Incorrect password"
  //     }
  //   } catch (e) {
  //     return {
  //       success: false,
  //       error: "Error Occured"
  //     }
  //   }
  // }
  /**
   * This function is used to check weather the user have existing account or not
   * @param {object} user 
   * @return token
   */
  async isUser(email, userName) {
    const Op = Sequelize.Op;
    try {
      const userRecord = await Model.users.findOne({
        where: {
          [Op.or]: [{
            email: email
          },
          {
            userName: userName
          },
          ]

        }
      })
      if (!userRecord) return {
        success: false,
        error: "That’s weird… This user does not exist."
      }

      return {
        success: true,
        user: {
          id: userRecord.id,
          roleId: userRecord.roleId,
          userName: userRecord.userName,
          firstName: userRecord.firstName,
          lastName: userRecord.lastName,
          email: userRecord.email,
          imageUrl: userRecord.imageUrl,
          imageThumbUrl: userRecord.imageThumbUrl,
          status: userRecord.status
        }
      }
    } catch (e) {
      return {
        success: false,
        error: `Error Occured .${e} `
      }
    }
  }

  async userByEmail(email) {
    const Op = Sequelize.Op;
    try {
      const userRecord = await Model.users.findOne({
        where: {
          email: email
        }
      })
      if (!userRecord) return {
        success: false,
        error: "That’s weird… This user does not exist."
      }

      return {
        success: true,
        user: {
          id: userRecord.id,
          roleId: userRecord.roleId,
          userName: userRecord.userName,
          firstName: userRecord.firstName,
          lastName: userRecord.lastName,
          email: userRecord.email,
          imageUrl: userRecord.imageUrl,
          imageThumbUrl: userRecord.imageThumbUrl,
          status: userRecord.status
        }
      }
    } catch (e) {
      return {
        success: false,
        error: `Error Occured .${e} `
      }
    }
  }
  /**
   * This function is use to save verification token in database
   *
   */
  async saveToken(token, email, t) {
    const today = (new Date());
    // const resetExpiry= today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
    const convertTime = moment(today).format("YYYY-MM-DD");
    try {
      const userRecord = await Model.users.update({
        resetToken: token,
        resetExpiry: convertTime
      }, {
        where: {
          email: email
        },
        transaction: t
      })
      if (!userRecord) return false
      return true
    } catch (e) {
      return {
        success: false,
        error: "Error Occured"
      }
    }
  }
  /**
   * This function is use to save verification token in database
   *
   */
  async verifyToken(email, token) {

    const today = (new Date());
    const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
    try {
      const userRecord = await Model.users.findOne({
        where: {
          email: email
        }
      })
      if (!userRecord) return {
        success: false,
        error: "User not found"
      }
      // return
      if (userRecord.resetToken != token) return {
        success: false,
        error: "This verification code is incorrect."
      }
      //return
      const strt = moment(userRecord.resetExpiry, "YYYY-MM-DD");
      const end = moment(date, "YYYY-MM-DD");
      if (Math.abs(strt.diff(end, 'days')) > 7) return {
        success: false,
        error: "Token has been expired"
      }
      return {
        success: true,
        user: {
          id: userRecord.id,
          roleId: userRecord.roleId,
          firstName: userRecord.firstName,
          lastName: userRecord.lastName,
          email: userRecord.email,
          imageUrl: userRecord.imageUrl,
          imageThumbUrl: userRecord.imageThumbUrl,
          status: userRecord.status
        },
      }
    } catch (e) {
      console.error(e);
      return {
        success: false,
        error: e
      }

    }
  }
  /**
   * This function is use to save verification token in database
   *
   */
  async removeToken(email) {
    try {
      const userRecord = await Model.users.update({
        resetToken: null,
        resetExpiry: null,
        // status: active
      }, {
        where: {
          email: email
        }
      })
      if (!userRecord) return {
        success: false,
        error: "User not found"
      }
      return {
        success: true,
        user: {
          id: userRecord.id,
          roleId: userRecord.roleId,
          firstName: userRecord.firstName,
          lastName: userRecord.lastName,
          email: userRecord.email,
          imageUrl: userRecord.imageUrl,
          imageThumbUrl: userRecord.imageThumbUrl,
          status: userRecord.status
        },
      }
    } catch (e) {
      return {
        success: false,
        error: "Error Occured"
      }
    }
  }
  /**
   * This function is used to generate jsonwebtoken
   * @param {object} user 
   * @return token
   */
  generateJWT(user) {
    //Return jsonwebtoken: 
    return jwt.sign({
      data: {
        id: user.id,
        roleId: user.roleId,
        email: user.email,
        userName: user.userName
      }
    }, jwtPrivateKey, {
      expiresIn: '168h' //7 days
    });
  }
}

module.exports = new AuthService()