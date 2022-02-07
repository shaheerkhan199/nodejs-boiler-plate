const verifyAppleToken = require('verify-apple-id-token').default;
const Auth = require("../services/Auth")
const Mailer = require("../services/Mailer")
const validation = require("../validations/validation")
const bcrypt = require("bcryptjs")
const sharp = require("sharp")
const Model = require("../models")
const _ = require("lodash")
const Response = require("../utils/Response");
const { adminRole, active, inActive, unverified, } = require("../startup/constants")
const socialaccounts = require("../models/socialaccounts");
const { DataTypes, Sequelize } = require('sequelize');
const db = require("../models/index");
const socialModels = socialaccounts(db.sequelize, DataTypes)
const socialModel = new socialModels();
const userss = require("../models/users");
const userModels = userss(db.sequelize, DataTypes)
const userModel = new userModels()
const avatars = require("../models/avatar");
const avatarModel = avatars(db.sequelize, DataTypes);
const avatar = new avatarModel();

module.exports = {
  /**
   * This controller is use to create avatar images
   * @param {object} req 
   * @param {object} res 
   */
  createAvatar: async function (req, res) {
    var imagePath = `https://${req.headers.host}/${req.file.path}`;
    const thumbPath = `public/uploads/avatar/thumb_${Date.now()}_${req.body.userName}_${req.body.id}_${req.file.originalname}`
    await sharp(req.file.path)
      .resize(400)
      .jpeg({
        quality: 50
      })
      .toFile(
        thumbPath
      )
    var imageThumbPath = `https://${req.headers.host}/${thumbPath}`;
    const isAvatar = await avatar.createAvatarRecord(imagePath, imageThumbPath);
    if (!isAvatar.success)
      return res.status(400).send(Response.failure(400, ` Error Occurred: ${isAvatar.error} `));

    return res.status(200).send(Response.success(200, isAvatar.avatar))
  },
  getAvatar: async function (req, res) {
    const getAvatar = await avatar.getAvatar();
    if (!getAvatar.success)
      return res.status(400).send(Response.failure(400, isAvatar.error));
    return res.status(200).send(Response.success(200, getAvatar.avatar));
  },
  /**
   * This controller is use to check user account is exist or not 
   * @param {object} req 
   * @param {object} res 
   */
  isExists: async function (req, res) {
    const {
      error
    } = validation.validateSignupExists(req.body)
    if (error)
      return res.status(400).send(Response.failure(400, `Input validation failed. ${error.details[0].message}`));
    try {
      const isUser = await Auth.isUser(null, req.body.userName);
      // if (isUser.success && isUser.user.email == req.body.email)
      //   return res.status(200).send(Response.success(200, `Account with this email address ${req.body.email} already exist. Please choose different email address`));
      if (isUser.success && isUser.user.userName == req.body.userName) {
        return res.status(200).send(Response.success(400, `Account with this username ${req.body.userName} exist. Please choose different username.`));
      }
      return res.status(200).send(Response.success(200, `No user found`));
    } catch (e) {
      console.error(e)
      return res.status(500).send(Response.failure(500, "Server Error"))
    }

  },
  // when user enter email create his account and send opt code
  signup: async function (req, res) {
    let code = Math.floor(1000 + Math.random() * 9000);
    const {
      error
    } = validation.validateSignup(req.body)
    if (error)
      return res.status(400).send(Response.failure(400, `Input validation failed.`)); // 
    try {
      const email = req.body.email.toLowerCase();
      const isUser = await Auth.userByEmail(email);
      const t = await Model.sequelize.transaction();
      if (isUser.success && isUser.user.status === active) {
        return res.status(400).send(Response.failure(400, `Account with this email address ${email} already exist. Please choose different email address`));
      }
      if (isUser.success && isUser.user.status === unverified) { // unverified account
        const sub = "Verification Code"
        const text = "This is your four digit verification code"
        if (!(await Auth.saveToken(code, isUser.user.email, t)))
          return res.status(500).send(Response.failure(500, "Error occured"));
        Mailer.sendVerificationToken(isUser.user.email, code, text, sub);
        await t.commit();
        return res
          .status(200)
          .send(Response.success(200, {
            message: "We sent you a new code. Please check your inbox.",
            code: code
          }));
      }
      req.body.status = unverified;
      const isAccountCreated = await Auth.signup(req, t);
      if (!isAccountCreated.success)
        return res.status(500).send(Response.failure(500, isAccountCreated.error));
      if (!(await Auth.saveToken(code, isAccountCreated.user.email, t)))
        return res.status(500).send(Response.failure(500, "Error occured"));

      const sub = "Verification Code"
      const text = "This is your four digit verification code"
      await t.commit();
      Mailer.sendVerificationToken(isAccountCreated.user.email, code, text, sub);
      return res
        .status(200)
        .send(Response.success(200, {
          message: "We sent you a new code. Please check your inbox.",
          code: code
        }));
    } catch (e) {
      console.error(e)
      await t.rollback()
      return res.status(500).send(Response.failure(500, "Server Error"))
    }
  },
  /**
   * This controller is use to create user account in web app
   * @param {object} req 
   * @param {object} res 
   */
  finishSignup: async function (req, res) {
    const error0 = validation.validateFinishSignup(req.body).error;
    const error1 = validation.validateParamID(req.params).error;
    if (error0 || error1)
      return res.status(400).send(Response.failure(400, `Input validation failed.`)); // 
    try {
      const email = req.body.email.toLowerCase();
      const userName = req.body.userName.toLowerCase();

      const isUser = await Auth.isUser(null, userName);
      if (isUser.success && isUser.user.userName == userName) {
        return res.status(400).send(Response.failure(400, `Account with this username ${userName} exist. Please choose different username.`));
      }

      const isAccountCreated = await Auth.finishSignup(req, req.body.imageUrl || "", req.body.imageThumbUrl || "");
      if (!isAccountCreated.success)
        return res.status(500).send(Response.failure(500, isAccountCreated.error));
      const isUsers = await Auth.isUser(email, userName);

      const sub = "Welcome to TickFilm"
      const text = "Your email address has been verified. Thank you for joining TickFilm.";
      Mailer.sendVerificationToken(email, null, text, sub)
      return Auth.loginResponse(isUsers, res)
    } catch (e) {
      console.error(e)
      return res.status(500).send(Response.failure(500, "Server Error"))
    }
  },
  /**
   * This controller is use to create user account in app with socail account
   * @param {object} req 
   * @param {object} res 
   */
  signupSocial: async function (req, res) {
    const {
      error
    } = validation.validateSocial(req.body)
    if (error)
      return res.status(400).send(Response.failure(400, `Input validation failed.`));
    try {
      const isAccount = await socialModel.isSocialAccount(req.body.socialId, req.body.platform);
      if (isAccount.success) {
        const users = await userModel.userById(isAccount.user.userid);
        return Auth.loginResponse(users, res);
      }
      if (req.body.platform.toLowerCase() === "apple") {
        const jwtClaims = await verifyAppleToken({
          idToken: req.body.socialId,
          clientId: 'com.tickfilm',
        });
        req.body.email = jwtClaims.email;
        req.body.firstName = req.body.email.substring(0, req.body.email.lastIndexOf("@"));
        req.body.lastName = "";
      }
      const {
        error
      } = validation.validateCreateSocial(req.body)
      if (error)
        return res.status(400).send(Response.failure(400, `Input validation failed.`));
      var imagePath = `https://${req.headers.host}/public/uploads/avatar/image_1603890492305_undefined_avatar1.png`;
      var imageThumbPath = `https://${req.headers.host}/public/uploads/avatar/thumb_1603890492579_undefined_undefined_avatar1.png`;
      const t = await Model.sequelize.transaction();
      // getting last record of user to generate next user id;
      let lastUserRecord = await Model.users.findAll({
        limit: 1,
        order: [['createdAt', 'DESC']]
      })
      lastUserRecord = JSON.parse(JSON.stringify(lastUserRecord))
      let newUserId
      if (lastUserRecord.length > 0) {
        newUserId = (Number(lastUserRecord[0].id) + 1);
      } else {
        newUserId = 1;
      }
      req.body.userName = `${req.body.firstName}${newUserId}`
      req.body.status = active
      req.body.password = req.body.email
      email = req.body.email
      const isUser = await Auth.isUser(email, req.body.userName);
      if (isUser.success && isUser.user.email == email) {
        await socialModel.createSocialAccount(req, isUser.user)
        return Auth.loginResponse(isUser, res);
      }
      const isAccountCreated = await Auth.socialSignup(req, imagePath, imageThumbPath, t);
      if (!isAccountCreated.success)
        return res.status(500).send(Response.failure(500, isAccountCreated.error));
      await t.commit();
      let createSocialAccResponse = await socialModel.createSocialAccount(req, isAccountCreated.user)
      return Auth.loginResponse(isAccountCreated, res);
    } catch (e) {
      console.error(e)
      await t.rollback()
      return res.status(500).send(Response.failure(500, "Server Error"))
    }
  },
  /**
   * This controller is use to login user on (web app)/(admin panel)
   * @param {object} req 
   * @param {object} res 
   */
  login: async function (req, res) {
    const {
      error
    } = validation.validateLogin(req.body)
    if (error)
      return res.status(400).send(Response.failure(400, `Input validation failed.`));
    try {
      const isUser = await Auth.userByEmail(req.body.email);
      if (!isUser.success)
        return res.status(400).send(Response.failure(400, isUser.error));
      const isLoggedin = await Auth.login(req.body.email, req.body.password);
      if (!isLoggedin.success)
        return res.status(isLoggedin.code).send({
          status: isLoggedin.code,
          error: {
            message: isLoggedin.error
          }
        });
      if (req.body.deviceToken != null || req.body.deviceToken != "null" || req.body.deviceToken != "") {
        // if enableNotification key is true the store this deviceToken else ignore this device Token
        if (isLoggedin.user.roleId === adminRole) { // check for admin login
          if (isLoggedin.user.enableNotifications === "" || isLoggedin.user.enableNotifications === true || isLoggedin.user.enableNotifications === null || isLoggedin.user.enableNotifications === "null") { // check enableNotification key (enable)
            req.body.id = isLoggedin.user.id;
            await Auth.updateUserDevice(req);
            // setting enableNotification key to true
            await Model.users.update({
              enableNotifications: true
            }, {
              where: {
                id: isLoggedin.user.id
              }
            });
          }
        } else { // simple user role just storing token
          req.body.id = isLoggedin.user.id;
          await Auth.updateUserDevice(req)
        }
      }
      isLoggedin.user.role = isUser.user.roleId == 2 ? "admin" : isUser.user.roleId == 3 ? "subadmin" : "user"
      return Auth.loginResponse(isLoggedin, res);
    } catch (e) {
      console.error(e)
      return res.status(500).send(Response.failure(500, "Something went wrong. Please try to log in again."))
    }
  },
  /**
   * This controller is use to send verification code on user email
   * @param {object} req 
   * @param {object} res 
   */
  forgetPassword: async function (req, res) {
    const {
      error
    } = validation.validateEmail(req.body)
    if (error)
      return res.status(400).send(Response.failure(400, `Input validation failed.`));
    let code = Math.floor(1000 + Math.random() * 9000);
    try {
      const isUser = await Auth.userByEmail(req.body.email);
      if (!isUser.success) return res.status(400).send(Response.failure(400, isUser.error));
      if (isUser.user.status == 2) return res.status(400).send(Response.failure(400, "Your account has been de-activated by the admin. Please contact at support@tickfilm.com for further query."));
      if (!(await Auth.saveToken(code, isUser.user.email)))
        return res.status(400).send(Response.failure(400, "Error Occured"));
      const sub = "Verification code"
      const text = "This is your four digit verification code"
      Mailer.sendVerificationToken(isUser.user.email, code, text, sub);
      return res.status(200).send(Response.success(200, {
        message: `We sent you a new code. Please check your inbox.`,
        code: code
      }))

    } catch (e) {
      console.error(e)
      return res.status(500).send(Response.failure(500, "Server Error"))
    }
  },
  /**
   * This controller is use to validate verify token
   * @param {object} req 
   * @param {object} res 
   */
  verifyToken: async function (req, res) {
    const {
      error
    } = validation.validateVerifyEmail(req.body)
    if (error)
      return res.status(400).send(Response.failure(400, `Input validation failed.`));
    try {
      const isUser = await Auth.userByEmail(req.body.email);

      if (!isUser.success)
        return res.status(400).send(Response.failure(400, "Arghh... Verification failed. Please try again later"));

      const isToken = await Auth.verifyToken(req.body.email, req.body.token);
      if (!isToken.success) return res.status(400).send(Response.failure(400, isToken.error));
      if (isToken.user.status == 2) return res.status(400).send(Response.failure(400, "Your account has been de-activated by the admin. Please contact at support@tickfilm.com for further query."));
      const removeToken = await Auth.removeToken(req.body.email)
      if (!removeToken.success)
        return res.status(500).send(Response.failure(500, "This verification code is incorrect."));
      // if (isToken.user.status == 0) {
      //   const sub = "Welcome to TickFilm"
      //   const text = "Your email address has been verified. Thank you for joining TickFilm.";
      //   Mailer.sendVerificationToken(isToken.user.email, null, text, sub)
      // }
      const isUsers = await Auth.userByEmail(req.body.email);
      // return Auth.loginResponse(isUsers, res)
      return res.status(200).send(Response.success(200, isUsers));
    } catch (e) {
      console.error(e)
      return res.status(500).send(Response.failure(500, "Arghh... Verification failed. Please try again later"))
    }
  },
  /**
   * This controller is use to reset password
   * @param {object} req 
   * @param {object} res 
   */
  resetPassword: async (req, res) => {
    const {
      error
    } = validation.validateResetPassword(req.body);
    if (error) return res.status(400).send(Response.failure(400, "Input validation failed."));

    const {
      email,
      password
    } = req.body

    try {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);
      const isUser = await Auth.userByEmail(req.body.email);
      if (isUser.success && isUser.user.status != active) {
        return res.status(400).send(Response.failure(400, "Please complete your signup first."));
      }
      if (!isUser.success)
        return res.status(400).send(Response.failure(400, isUser.error));
      const userRecord = await Model.users.findOne({
        where: {
          id: isUser.user.id
        }, raw: true
      })
      if (userRecord.resetToken != null) return res.status(400).send(Response.failure(400, 'We have sent you a verification code. Please Reset your Password first'));
      await Model.users.update({
        password: hashed
      }, {
        where: {
          email: email
        }
      });
      return res.status(200).send(Response.success(200, {
        message: "Your password has been updated."
      }));

    } catch (err) {
      console.error(err)
      return res.status(500).send(Response.failure(500, "Server Error"))
    }
  },
  /**
   * This controller is use to reset password
   * @param {object} req 
   * @param {object} res 
   */
  changePassword: async (req, res) => {
    const {
      error
    } = validation.validateUpdatePassword(req.body);
    if (error) return res.status(400).send(Response.failure(400, "Input validation failed."));

    const {
      password,
      oldPassword
    } = req.body
    try {
      if (password === oldPassword) {
        return res.status(400).send(Response.success(400, {
          message: "Your new password can not be the same as your old one"
        }));
      }
      const isLoggedin = await Auth.login(req.user.data.email, oldPassword);
      if (!isLoggedin.success)
        return res.status(isLoggedin.code).send({
          status: isLoggedin.code,
          error: {
            message: isLoggedin.error
          }
        });
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);
      const isUser = await Auth.userByEmail(req.user.data.email);
      if (!isUser.success)
        return res.status(400).send(Response.failure(400, isUser.error));
      const userRecord = await Model.users.findOne({
        where: {
          id: isUser.user.id
        }, raw: true
      })
      await Model.users.update({
        password: hashed
      }, {
        where: {
          email: req.user.data.email
        }
      });
      return res.status(200).send(Response.success(200, {
        message: "Your password has been updated."
      }));

    } catch (err) {
      console.error(err)
      return res.status(500).send(Response.failure(500, "Server Error"))
    }
  }
}