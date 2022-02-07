const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const moment = require("moment");
const Model = require("../models")
const {
  active,
  inActive
} = require("../startup/constants")
const validation = require("../validations/validation")
const Mailer = require("../services/Mailer")
const { DataTypes, Sequelize, Op } = require('sequelize');
const db = require("../models/index");
const users = require("../models/users");
const userModels = users(db.sequelize, DataTypes)
const userModel = new userModels()
const Response = require("../utils/Response");
const { sequelize } = require("../models/index");

const notification = require("../services/notification");
const sharp = require("sharp")

const Auth = require("../services/Auth")

module.exports = {
  allUsers: async (req, res) => {
    try {
      let status;
      var reqLimit = (req.query.limit) ? Number(req.query.limit) : 10;
      var reqOffset = (req.query.offset) ? Number(req.query.offset) : 0;
      req.query.like ? like = `%${req.query.like}%` : like = "%%";
      req.query.status ? status = [Number(req.query.status)] : status = [active, inActive];
      const users = await userModel.getUsers(reqLimit, reqOffset, status, like)
      return res.status(200).send(Response.success(200, {
        totalUsers: users.count,
        users: users.rows
      }))
    } catch (e) {
      console.error(e)
      return res.status(500).send(Response.failure(500, "The users seem to be asleep. Refresh the page to wake them up."))
    }
  },
  userStats: async (req, res) => {
    let actived;
    let banned;
    const month = Number(req.query.month) || null
    const year = Number(req.query.year) || null
    try {
      if (req.query.status && req.query.period) {
        const status = Number(req.query.status); // active (1) banned (2)
        const period = req.query.period; // allTime or thisMonth or thisWeek
        if (period === "allTime") {
          const users = await userModel.getUsersStats(null, null);
          let filteredUsers = users.rows.filter(a => a.status == status);
          return res.status(200).send(Response.success(200, {
            usersCount: filteredUsers.length,
          }))
        } else if (period === "thisMonth") {
          // first find out current month
          let currentMonth = (new Date().getMonth() + 1);
          let currentYear = (new Date().getFullYear());
          const users = await userModel.getUsersStats(currentMonth, currentYear);
          let filteredUsers = users.rows.filter(a => a.status == status);
          return res.status(200).send(Response.success(200, {
            usersCount: filteredUsers.length,
          }))
        } else { // thisWeek
          let startdate = moment().format('YYYY-MM-DD HH:mm:ss');
          let endDate = moment()
            .subtract(7, 'days')
            .format('YYYY-MM-DD HH:mm:ss');
          const users = await userModel.getWeeklyUsersStats(startdate, endDate);
          let filteredUsers = users.rows.filter(a => a.status == status);
          return res.status(200).send(Response.success(200, {
            usersCount: filteredUsers.length,
          }))
        }
      } else { // all users banned,active
        const users = await userModel.getUsersStats(month, year)
        actived = users.rows.filter(a => a.status == active);
        banned = users.rows.filter(a => a.status == inActive);
        // getting count of Premium users
        const premiumUsersCount = await premiumuserModel.getPremiumUsersCount(month, year);
        console.log("premiumUsersCount ==> ", premiumUsersCount);
        return res.status(200).send(Response.success(200, {
          totalUsers: (users.count + premiumUsersCount.count),
          activeUsers: actived.length,
          bannedUsers: banned.length,
          premiumUsers: premiumUsersCount.count,
        }))
      }
    } catch (e) {
      console.error(e)
      return res.status(500).send(Response.failure(500, "Data says no. Please try reloading the data by reloading by refreshing the page."))
    }

  },
  appDownloadCount: async (req, res) => {

    const {
      error
    } = validation.validateAppCountReq(req.query)
    if (error)
      return res.status(400).send(Response.failure(400, `Input query validation failed, details: ${error.details[0].message} `));
    try {
      const startMonth = Number(req.query.startMonth)
      const endMonth = Number(req.query.endMonth)
      const startYear = Number(req.query.startYear)
      const endYear = Number(req.query.endYear)

      const counts = await userModel.getMonthlyAppCount(startMonth, endMonth, startYear, endYear)

      return res.status(200).send(Response.success(200, counts))
    } catch (e) {
      console.error(e)
      return res.status(500).send(Response.failure(500, "Data says no. Please try reloading the data by reloading by refreshing the page."))
    }
  },
  updateUser: async (req, res) => {
    const {
      error
    } = validation.validateUpdateUser(req.body)
    if (error)
      return res.status(400).send(Response.failure(400, `Input query validation failed, details: ${error.details[0].message} `));
    try {
      const userUpdate = await userModel.editUser(req);
      if (!userUpdate.success) return res.status(400).send(Response.failure(400, userUpdate.error));
      const deleteInterests = await interestsModel.removeInterests(req);
      if (!deleteInterests.success) return res.status(400).send(Response.failure(400, deleteInterests.error));
      // check if a custom ticklist already exist "Based on your interests"
      // adding interest
      for (let genreID of req.body.genreIDs) {
        await interestsModel.addInterest(req, genreID.id);
      }
      res.status(200).send(Response.success(200, "User updated successfully"))
      let ticklistFound = await Model.collections.findOne({
        where: {
          isCustom: true,
          name: "Based on your interests",
          userID: req.user.data.id
        }
      });
      ticklistFound = JSON.parse(JSON.stringify(ticklistFound))
      const totalNoOfShows = 25;
      const individalNoOfShows = Math.floor(totalNoOfShows / req.body.genreIDs.length)
      if (ticklistFound) {
        // if custom ticklist already exist means we have to update the items with new interests
        await Model.collectionItems.destroy({
          where: {
            collectionID: ticklistFound.id
          }
        })
        await feedCustomTickListWithRandomShows(req, individalNoOfShows, ticklistFound);
      } else {
        // create new ticklist name "Based on your interests" and feed the items based on interest
        // creating a custom ticklist
        let customTicklist = await Model.collections.create({
          userID: req.user.data.id, // isAccountCreated.user.id,
          name: "Based on your interests",
          privacyType: "private",
          status: "active",
          isDefault: 0,
          isCustom: true
        });
        customTicklist = JSON.parse(JSON.stringify(customTicklist));
        await feedCustomTickListWithRandomShows(req, individalNoOfShows, customTicklist);
      }
    } catch (ex) {
      console.error(ex);
      return res.status(400).send(Response.failure(400, ex))
    }
  },
  updateUserImage: async (req, res) => {
    const {
      error
    } = validation.validateUserName(req.body)
    if (error)
      return res.status(400).send(Response.failure(400, `Input query validation failed, details: ${error.details[0].message} `));
    try {
      var imagePath = req.body.imagepath;
      var imageThumbPath = req.body.thumbpath;
      if (!req.body.imagepath) {
        imagePath = `https://${req.headers.host}/${req.file.path}`;
        const thumbPath = `public/uploads/${req.body.userName}/thumb_${Date.now()}_${req.body.userName}_${req.body.id}_${req.file.originalname}`
        await sharp(req.file.path)
          .resize(400)
          .jpeg({
            quality: 50
          })
          .toFile(
            thumbPath
          )
        imageThumbPath = `https://${req.headers.host}/${thumbPath}`;
      }
      const userUpdate = await userModel.editUserProfileImage(req, imagePath, imageThumbPath);
      if (!userUpdate.success) return res.status(400).send(Response.failure(400, userUpdate.error));
      // const deleteInterests = await interestsModel.removeInterests(req);
      //   if(!deleteInterests.success) return res.status(400).send(Response.failure(400, deleteInterests.error));
      // JSON.parse(req.body.genreIDs).forEach(element => {
      //   var genreID = element
      //   interestsModel.addInterest(req, genreID)
      //   // if(!addInterests.success) return res.status(400).send(Response.failure(400, addInterests.error));
      // });
      // console.log(JSON.parse(req.body.genreIDs))
      return res.status(200).send(Response.success(200, {
        imagePath,
        imageThumbPath
      }))
    } catch (ex) {
      console.error(ex);
      return res.status(400).send(Response.failure(400, ex))
    }
  },
  updateUserStatus: async (req, res) => {
    var {
      error: error1
    } = validation.validateParamID(req.params)
    if (error1)
      return res.status(400).send(Response.failure(400, `Input query validation failed, details: ${error1.details[0].message}  `));

    const {
      error: error2
    } = validation.validateUpdateUserStatus(req.body)
    if (error2)
      return res.status(400).send(Response.failure(400, `Input query validation failed, details: ${error2.details[0].message} `));
    try {
      const userUpdate = await userModel.updateUserStatus(req);
      if (!userUpdate.success) return res.status(400).send(Response.failure(400, userUpdate.error));
      const updatedUser = await Model.users.findOne({
        where: {
          id: req.params.id
        }
      })
      if (req.body.status === inActive) { // banned
        return res.status(200).send(Response.success(200, `The user '*${updatedUser.userName}*' has been banned.`))
      } else { // unbanned
        return res.status(200).send(Response.success(200, `The user '*${updatedUser.userName}*' has been unbanned.`))
      }
    } catch (ex) {
      console.error(ex);
      return res.status(400).send(Response.failure(400, ex))
    }
  },
  /**
   *  get user profile with collections
   * @param req
   * @param res
   */
  userProfile: async (req, res) => {
    try {
      var privacyType = ["public"];
      if (req.user.data.roleId == 2) {
        var privacyType = ["public", "private"]
      } else if (req.user.data.id == req.params.id) {
        var privacyType = ["public", "private"]
      }
      let user = await Model.users.findOne({
        where: {
          id: req.params.id
        },
        attributes: ["id", "userName", "firstName", "lastName", "imageUrl", "imageThumbUrl", "email", "status", "bio", "bioImageUrl", "bioImageThumbUrl", "isDottedBioImage"],
        include: [{
          model: Model.collections,
          where: {
            privacyType: privacyType,
          },
          required: false,
          order: [
            [sequelize.fn('max', sequelize.col('likeCount')), 'DESC'],
            [[{ model: Model.collectionItems }, 'createdAt', 'ASC']]
          ],
          // limit: 1,
          include: [{
            model: Model.collectionItems,
            attributes: ["id", "collectionID", "sourceID", "name", "imagePath", "mediaType", "createdAt"],
            order: [['createdAt', 'ASC']],
          }],
        },
        {
          model: Model.interests,
          include: [{
            model: Model.genres,
            attributes: ["id", "genreID", "name", "colorCode", "imagePath", "type", "textColor"]
          }]
        }
        ],
      })
      if (!user) return res.status(400).send(Response.failure(400, "sd"));
      user.dataValues.flagcount = await Model.userReport.count({
        where: {
          reportedUserID: req.params.id
        }
      });
      // collection isLike
      user = JSON.parse(JSON.stringify(user));
      await Promise.all(user.collections.map(async elements => {
        var isliked = await collectionLikesModel.isLike(elements.id, req.user.data.id);
        elements.islike = isliked.success
      }))
      // getting user reports
      var status = ['spam', 'inappropriate', 'fake'];
      const getMessages = await Model.userReport.findAll({
        where: {
          type: status,
          reportedUserID: req.params.id
        },
        include: [{
          model: Model.users,
          as: "reportingUser",
          attributes: ["firstName", "lastName", "userName", "email", "imageUrl", "imageThumbUrl"],
        }, {
          model: Model.users,
          as: 'reportedUser',
          attributes: ["firstName", "lastName", "userName", "email", "imageUrl", "imageThumbUrl"]
        }],
      })
      user['flags'] = JSON.parse(JSON.stringify(getMessages));
      return res.status(200).send(Response.success(200, user))
    } catch (ex) {
      console.error(ex);
      return res.status(400).send(Response.failure(400, ex))
    }
  },
  /**
   *  delete user profile 
   * @param req
   * @param res
   */
  deleteUserProfile: async (req, res) => {
    const {
      error
    } = validation.validateVerifyEmail(req.body)
    if (error)
      return res.status(400).send(Response.failure(400, `Input validation failed.`));

    try {
      const isToken = await Auth.verifyToken(req.user.data.email, req.body.token);
      if (!isToken.success) return res.status(400).send(Response.failure(400, isToken.error));
      // req.params.id = Number(req.params.id);
      // if(req.params.id !== req.user.data.id){
      //   return res.status(400).send(Response.failure(400,"You are not allowed to delete someone profile"))
      // }
      const user = await userModel.deleteUser(req);
      if (!user.success) return res.status(400).send(Response.failure(400, user.error));
      return res.status(200).send(Response.success(200, "Profile deleted successfully"))
    } catch (ex) {
      console.error(ex);
      return res.status(400).send(Response.failure(400, ex))
    }
  },
  deleteUserProfileRequest: async (req, res) => {
    let code = Math.floor(1000 + Math.random() * 9000);
    const {
      error
    } = validation.validateEmail(req.body)
    if (error)
      return res.status(400).send(Response.failure(400, `Input query validation failed, details: ${error.details[0].message} `));
    try {
      if (req.user.data.email !== req.body.email.toLowerCase()) {
        return res.status(400).send(Response.failure(400, "Incorrect Email"))
      }
      const email = req.user.data.email;
      const t = await Model.sequelize.transaction();
      const sub = "Verification Code"
      const text = "This is your four digit verification code"
      if (!(await Auth.saveToken(code, email, t)))
        return res.status(500).send(Response.failure(500, "Error occured"));
      await t.commit();
      Mailer.sendVerificationToken(email, code, text, sub);
      return res.status(200).send(Response.success(200, {
        message: "We sent you a new code. Please check your inbox.",
        code
      }))
    } catch (ex) {
      console.error(ex);
      await t.rollback()
      return res.status(400).send(Response.failure(400, ex))
    }
  },

  /**
   *  Get user notifications
   * @param req
   * @param res
   */
  userNotifications: async (req, res) => {
    try {
      // const getNotifications = await notificationsModel.getNotify(req)
      var reqLimit = (req.query.limit) ? Number(req.query.limit) : 10;
      var reqOffset = (req.query.offset) ? Number(req.query.offset) : 0;
      // like notifications (multiple ticklist => single user like multiple ticklist on same day)

      let likedNotificationsUser = await Model.notifications.findAll({
        attributes: [
          "id",
          "userId", // receiver id 
          "collectionID",
          "body",
          [Sequelize.fn("CONCAT", Sequelize.col('firstname'), " ", Sequelize.col("lastName")), "fullName"],
          // [Sequelize.fn("COUNT", Sequelize.col("notifications.collectionID")), "items"],
          [Sequelize.fn("DATE", Sequelize.col("notifications.createdAt")), "createdAt"],
        ],
        offset: reqOffset,
        limit: reqLimit,
        where: {
          userID: req.user.data.id,
          type: ['likeTicklist']
        },
        include: [
          {
            model: Model.users, // sender id
            attributes: ["id", "imageUrl", "imageThumbUrl"]
          },
          {
            model: Model.collections,
            // attributes:["id","imageUrl", "imageThumbUrl"]
          },
        ],
        order: [['createdAt', 'DESC']],
        // group: [[Sequelize.fn('DATE', Sequelize.col('notifications.createdAt')), 'Date']],
      })
      likedNotificationsUser = JSON.parse(JSON.stringify(likedNotificationsUser));

      let dateWise = {};
      likedNotificationsUser.forEach(element => {
        var date = new Date(element.createdAt).getDate();
        var month = new Date(element.createdAt).getMonth();
        var year = new Date(element.createdAt).getFullYear();
        var dateString = year + "-" + (month + 1) + "-" + date;
        if (dateWise[dateString] == undefined) dateWise[dateString] = [];
        element['type'] = "likeSingle";
        dateWise[dateString].push(element)
      });

      let stackNotificationCollID = {};
      for (let dateString in dateWise) {
        // stacking by collectionID 
        let stackedNotifications = [];
        var noOfElements = dateWise[dateString].length;
        let likedNotificationsUser = dateWise[dateString]
        stackedNotifications.push({ ...likedNotificationsUser.shift(), items: 1 })

        for (let i = 1; i < noOfElements; i++) {
          let notification = likedNotificationsUser.shift();
          let foundIndex = stackedNotifications.findIndex(element => element.collectionID === notification.collectionID)
          if (foundIndex === -1) {
            stackedNotifications.push({ ...notification, items: 1 });
          } else {
            let existingNotification = stackedNotifications[foundIndex]
            existingNotification['items'] = existingNotification['items'] ? existingNotification['items'] + 1 : 1;
            existingNotification['type'] = "multiUser";
            stackedNotifications.splice(foundIndex, 1, existingNotification)
          }
        }
        stackNotificationCollID[dateString] = stackedNotifications;
      }

      let likeDatewise = {}
      for (let dateString in stackNotificationCollID) {
        // stacking by userID 
        let stackedNotifications = [];
        var noOfElements = stackNotificationCollID[dateString].length;
        let likedNotificationsUser = stackNotificationCollID[dateString]
        stackedNotifications.push({ ...likedNotificationsUser.shift() })

        for (let i = 1; i < noOfElements; i++) {
          let notification = likedNotificationsUser.shift();
          let foundIndex = stackedNotifications.findIndex(element => element.user.id === notification.user.id)
          if (foundIndex === -1) {
            stackedNotifications.push({ ...notification, items: 1 });
          } else {
            let existingNotification = stackedNotifications[foundIndex]
            existingNotification['items'] = existingNotification['items'] ? existingNotification['items'] + 1 : 1;
            existingNotification['type'] = "multiTicklist";
            stackedNotifications.splice(foundIndex, 1, existingNotification)
          }
        }
        likeDatewise[dateString] = stackedNotifications;
      }

      // share notifications
      const sharedNotifications = await Model.notifications.findAll({
        attributes: [
          "id",
          "userId", // receiver id 
          [Sequelize.fn("CONCAT", Sequelize.col('firstname'), " ", Sequelize.col("lastName")), "fullName"],
          [Sequelize.fn("COUNT", Sequelize.col("notifications.id")), "items"],
          [Sequelize.fn("DATE", Sequelize.col("notifications.createdAt")), "createdAt"],
        ],
        offset: reqOffset,
        limit: reqLimit,
        where: {
          userID: req.user.data.id,
          type: ['shared', 'SHARED_WATCHLIST']
        },
        include: [{
          model: Model.users, // sender id
          attributes: ["id", "imageUrl", "imageThumbUrl"]
        }],
        order: [['createdAt', 'DESC']],
        group: [['otherUserID'], [Sequelize.fn('DATE', Sequelize.col('notifications.createdAt')), 'Date']]
      })
      // other notifications
      const getNotifications = await Model.notifications.findAll({
        offset: reqOffset,
        limit: reqLimit,
        where: {
          userID: req.user.data.id,
          type: { [Op.notIn]: ['shared', 'SHARED_WATCHLIST', 'likeTicklist', 'flaggedProfiles', 'reportMessages'] }
        },
        include: [{
          model: Model.users,
          attributes: ["id", "imageUrl", "imageThumbUrl"]
        }],
        order: [['createdAt', 'DESC']]
      })
      if (!getNotifications) return res.status(200).send(Response.success(200, getNotifications.error));
      var dates = {};
      getNotifications.forEach(element => {
        var date = new Date(element.createdAt).getDate();
        var month = new Date(element.createdAt).getMonth();
        var year = new Date(element.createdAt).getFullYear();
        var dateString = year + "-" + (month + 1) + "-" + date;
        if (dates[dateString] == undefined) dates[dateString] = [];
        dates[dateString].push(element)
      });
      // appending shared notifications
      let sharedDateWise = {};
      sharedNotifications.forEach(element => {
        var date = new Date(element.createdAt).getDate();
        var month = new Date(element.createdAt).getMonth();
        var year = new Date(element.createdAt).getFullYear();
        var dateString = year + "-" + (month + 1) + "-" + date;
        if (sharedDateWise[dateString] == undefined) sharedDateWise[dateString] = [];
        element["type"] = "sharedTicklist"
        sharedDateWise[dateString].push(element)
      });

      let finalNotifications = { ...likeDatewise };

      // combining like and share notifications
      for (let dateString in sharedDateWise) {
        if (finalNotifications[dateString]) {
          finalNotifications[dateString].push(...sharedDateWise[dateString]);
        } else {
          finalNotifications[dateString] = [...sharedDateWise[dateString]];
        }
      }
      // combining like and share with others reamining
      for (let dateString in dates) {
        if (finalNotifications[dateString]) {
          finalNotifications[dateString].push(...dates[dateString]);
        } else {
          finalNotifications[dateString] = [...dates[dateString]];
        }
      }

      const orderedNotificationsData = {};
      // sorting data datw wise
      Object.keys(finalNotifications).sort(function (a, b) {
        return moment(b, 'YYYY-MM-DD').toDate() - moment(a, 'YYYY-MM-DD').toDate();
      }).forEach(function (key) {
        orderedNotificationsData[key] = finalNotifications[key];
      })

      return res.status(200).send(Response.success(200, orderedNotificationsData))

    } catch (ex) {
      console.error(ex);
      return res.status(400).send(Response.failure(400, ex))
    }
  },
  /**
   *  Get user admin messages
   * @param req
   * @param res
   */
  getUserAdminMessages: async (req, res) => {
    try {
      const Op = Sequelize.Op;
      let like = `%${req.query.like}%`
      like == `%${undefined}%` ? like = "%%" : like = `%${req.query.like}%`
      var reqLimit = (req.query.limit) ? Number(req.query.limit) : 10;
      var reqOffset = (req.query.offset) ? Number(req.query.offset) : 0;
      var status = (req.query.status) ? req.query.status : ["read", "un-read"]
      const getMessages = await Model.userAdminMessages.findAndCountAll({
        offset: reqOffset,
        limit: reqLimit,
        where: {
          status: status
        },
        include: [{
          model: Model.users,
          attributes: ["id", "firstName", "lastName", "userName", "email", "imageUrl", "imageThumbUrl"],
          where: {
            [Op.or]: [
              Sequelize.where(Sequelize.fn("concat", Sequelize.col("firstName"), ' ', Sequelize.col("lastName")), {
                [Op.like]: `%${like}%`
              }),
            ]
          }
        }],
        order: [['createdAt', 'DESC']]
      })
      if (!getMessages) return res.status(200).send(Response.success(200, getMessages.error));
      return res.status(200).send(Response.success(200, getMessages))

    } catch (ex) {
      console.error(ex);
      return res.status(400).send(Response.failure(400, ex))
    }
  },

  /**
   *  create user admin messages
   * @param req
   * @param res
   */
  createUserAdminMessages: async (req, res) => {
    var {
      error
    } = validation.validateAdminMessage(req.body)
    if (error)
      return res.status(400).send(Response.failure(400, `Input query validation failed, details: ${error.details[0].message}  `));
    try {
      const createMessage = await userAdminMessagesModel.createReport(req)
      if (!createMessage) return res.status(200).send(Response.success(200, createMessage.error));
      // getting info of reporting user
      const Requesteduser = await userModel.userById(req.user.data.id)
      // Generate notification of report (e.g bugreport or any query) for admin
      //get admin record
      const admin = await userModel.userByRoleId(2) // 2 is admin role
      const adminId = admin.user.id;
      const sendNotifications = await notificationsModel.createNotify(req.user.data.id, adminId, Requesteduser.user.firstName + " " + Requesteduser.user.lastName, " has report an issue", "reportMessages", "pending")
      if (!sendNotifications.success) return res.status(400).send(Response.failure(400, sendNotifications));
      // Sending push notification to web
      // need to fetch admin to get its device token from record
      if (admin.user.deviceToken !== '' || admin.user.deviceToken !== null || admin.user.deviceToken !== 'null') {
        notification.sendNotification(admin.user.deviceToken, Requesteduser.user.firstName + " " + Requesteduser.user.lastName, ` has report an issue: ${req.body.message}`, "reportMessages")
        console.log("sending push notification");
      }
      return res.status(200).send(Response.success(200, "Message sent successfully."))
    } catch (ex) {
      console.error(ex);
      return res.status(400).send(Response.failure(400, ex))
    }
  },
  /**
   *  delete user admin messages
   * @param req
   * @param res
   */
  deleteUserAdminMessages: async (req, res) => {
    var {
      error
    } = validation.validateParamID(req.params)
    if (error)
      return res.status(400).send(Response.failure(400, `Input query validation failed, details: ${error.details[0].message}  `));
    try {
      const deleteMessage = await userAdminMessagesModel.deleteReport(req)
      if (!deleteMessage) return res.status(200).send(Response.success(200, deleteMessage.error));
      return res.status(200).send(Response.success(200, "Delete successfully"))
    } catch (ex) {
      console.error(ex);
      return res.status(400).send(Response.failure(400, ex))
    }
  },
  /**
   *  reply user admin messages
   * @param req
   * @param res
   */
  replyUserAdminMessages: async (req, res) => {
    var {
      error
    } = validation.validateReplyAdminMessage(req.body)
    if (error)
      return res.status(400).send(Response.failure(400, `Input query validation failed, details: ${error.details[0].message}  `));
    try {

      const usersData = await userModel.userByEmail(req.body.email);
      if (!usersData.success) return res.status(400).send(Response.failure(400, usersData.error));
      const updateMessageStatus = await userAdminMessagesModel.updateReportStatus(req)
      if (!updateMessageStatus.success) return res.status(400).send(Response.failure(400, updateMessageStatus.error));
      Mailer.adminMessage(usersData.user.firstName + " " + usersData.user.lastName, "okay report", req.body.message, req.body.email);
      return res.status(200).send(Response.success(200, "Mail sent successfully"))
    } catch (ex) {
      console.error(ex);
      return res.status(400).send(Response.failure(400, ex))
    }
  },
  /**
   *  get user status story
   * @param req
   * @param res
   */
  userNotificatuserNotificationion: async (req, res) => {
    const {
      error
    } = validation.validateSendNotification(req.body)
    if (error)
      return res.status(400).send(Response.failure(400, `Input query validation failed, details: ${error.details[0].message} `));
    try {
      otherUserID = req.body.otherUserID
      userID = req.user.data.id
      type = req.body.type
      body = req.body.body
      const user = await userModel.userById(otherUserID)
      const sendingUser = await userModel.userById(userID)
      const sendNotifications = await notificationsModel.createNotify(otherUserID,
        userID,
        sendingUser.user.firstName + " " + sendingUser.user.lastName,
        ` ${body}`,
        type,
        "sent", req.body.channelID || null);
      if (!sendNotifications.success) return res.status(400).send(Response.failure(400, sendNotifications));
      await notification.sendNotification(user.user.deviceToken,
        sendingUser.user.firstName + " " + sendingUser.user.lastName,
        ` ${body}`,
        type);
      return res.status(200).send(Response.success(200, "Notification sent successfully"))
    } catch (ex) {
      console.error(ex);
      return res.status(400).send(Response.failure(400, ex))
    }
  },
  /**
   *  create flag againist a user
   * @param req
   * @param res
   */
  createFlagUser: async (req, res) => {
    const {
      error
    } = validation.reportCreate(req.body)
    if (error)
      return res.status(400).send(Response.failure(400, `Input query validation failed, details: ${error.details[0].message} `));
    try {
      const createReport = await userReportModel.createReport(req);
      if (!createReport.success) return res.status(400).send(Response.failure(400, createReport));
      // getting info of reporting user
      const Requesteduser = await userModel.userById(req.user.data.id)
      // Generate notification of flag for admin dashboard
      const sendNotifications = await notificationsModel.createNotify(req.user.data.id, req.body.userID, Requesteduser.user.firstName + " " + Requesteduser.user.lastName, ` flag a profile as ${req.body.type}`, "flaggedProfiles", "pending")
      if (!sendNotifications.success) return res.status(400).send(Response.failure(400, sendNotifications));
      // Sending push notification to web
      // need to fetch admins device tokens if many admins
      const admin = await userModel.userByRoleId(2) // 2 is admin role
      if (!admin.success) return res.status(400).send(Response.failure(400, admin.error));
      if (admin.user.deviceToken !== '' || admin.user.deviceToken !== null || admin.user.deviceToken !== 'null') {
        notification.sendNotification(admin.user.deviceToken, Requesteduser.user.firstName + " " + Requesteduser.user.lastName, ` flag a profile as ${req.body.type}`, "flaggedProfiles")
        console.log("sending push notification");
      }
      return res.status(200).send(Response.success(200, "Report submit successfully"))
    } catch (ex) {
      console.error(ex);
      return res.status(400).send(Response.failure(400, ex))
    }
  },
  /** 
   *  delete flag user report
   * @param req
   * @param res
   */
  deleteFlagReport: async (req, res) => {
    var {
      error
    } = validation.validateParamID(req.params)
    if (error)
      return res.status(400).send(Response.failure(400, `Input query validation failed, details: ${error.details[0].message}  `));
    try {
      const deleteMessage = await userReportModel.deleteReport(req)
      if (!deleteMessage.success) return res.status(200).send(Response.success(200, deleteMessage.error));
      return res.status(200).send(Response.success(200, "Delete successfully"))
    } catch (ex) {
      console.error(ex);
      return res.status(400).send(Response.failure(400, ex))
    }
  },
  /**
   *  Get flaged users
   * @param req
   * @param res
   */
  getFlagUsers: async (req, res) => {
    try {
      const Op = Sequelize.Op;
      let like = `%${req.query.like}%`
      like == `%${undefined}%` ? like = "%%" : like = `%${req.query.like}%`
      var reqLimit = (req.query.limit) ? Number(req.query.limit) : 10;
      var reqOffset = (req.query.offset) ? Number(req.query.offset) : 0;
      var status = (req.query.type) ? req.query.type : ['spam', 'inappropriate', 'fake'];
      var userStatus = [];
      if (req.query.userStatus === "active") {
        userStatus.push(1);
      } else if (req.query.userStatus === "banned") {
        userStatus.push(2);
      } else {
        userStatus.push(1);
        userStatus.push(2);
      }
      const getMessages = await Model.users.findAndCountAll({
        where: {
          [Op.or]: [
            Sequelize.where(Sequelize.fn("concat", Sequelize.col("users.firstName"), ' ', Sequelize.col("users.lastName")), {
              [Op.like]: `%${like}%`
            })
          ],
          [Op.and]: [
            { status: userStatus }
          ]
        },
        attributes: ["id", "firstName", "lastName", "userName", "email", "imageUrl", "imageThumbUrl", "status"],
        include: [
          {
            model: Model.users,
            as: 'ReportingUsers',
            through: {
              where: {
                type: status
              },
              required: true
            },
            attributes: ["id", "firstName", "lastName", "userName", "email", "imageUrl", "imageThumbUrl"],
          }
        ],
        offset: reqOffset,
        limit: reqLimit,
        order: [
          ['ReportingUsers', Model.userReport, 'createdAt', 'DESC']
        ]
      });

      let count = await Model.userReport.count({
        where: {
          type: status
        },
        include: {
          association: "reportedUser",
          where: {
            [Op.or]: [
              Sequelize.where(Sequelize.fn("concat", Sequelize.col("reportedUser.firstName"), ' ', Sequelize.col("reportedUser.lastName")), {
                [Op.like]: `%${like}%`
              })
            ],
            [Op.and]: [
              { status: userStatus }
            ]
          },
          required: true
        },
        group: [
          ['reportedUser.id']
        ]
      });
      getMessages.count = count.length;

      if (!getMessages) return res.status(400).send(Response.success(400, "Hmm... your flagged profile seems to be hiding. Please refresh the page"));
      return res.status(200).send(Response.success(200, getMessages))

    } catch (ex) {
      console.error(ex);
      return res.status(400).send(Response.failure(400, "Hmm... your flagged profile seems to be hiding. Please refresh the page"))
    }
  },
  /**
   *  Get all admin notifications
   * @param req
   * @param res
   */
  adminNotifications: async (req, res) => {
    try {
      var reqLimit = (req.query.limit) ? Number(req.query.limit) : 10;
      var reqOffset = (req.query.offset) ? Number(req.query.offset) : 0;
      const getNotifications = await Model.notifications.findAll({
        offset: reqOffset,
        limit: reqLimit,
        where: {
          type: {
            [Op.in]: ['reportMessages', 'flaggedProfiles', 'trailerPromotionExpire']
          }
        },
        order: [['createdAt', 'DESC']]
      })
      if (!getNotifications) return res.status(200).send(Response.success(200, getNotifications.error));
      // stacking notification by date and by stype 
      var dates = {};
      getNotifications.forEach(element => {
        var date = new Date(element.createdAt).getDate();
        var month = new Date(element.createdAt).getMonth();
        var year = new Date(element.createdAt).getFullYear();
        var dateString = year + "-" + (month + 1) + "-" + date;
        if (dates[dateString] == undefined) {
          dates[dateString] = {
            reportMessages: 0, // [],
            flaggedProfiles: 0, //[]
            trailerPromotionExpire: []
          };
        }
        const type = element.type;
        if (type === 'trailerPromotionExpire') {
          dates[dateString][type].push({ id: element.userID, title: element.title })
        } else {
          dates[dateString][type] = dates[dateString][type] + 1
        }
      });
      return res.status(200).send(Response.success(200, dates))
    } catch (ex) {
      console.error(ex);
      return res.status(400).send(Response.failure(400, ex))
    }
  },
  logoutUser: async (req, res) => {
    const {
      error
    } = validation.validateParamID(req.params)
    if (error)
      return res.status(400).send(Response.failure(400, `Input query validation failed, details: ${error.details[0].message} `));
    try {
      const userUpdate = await userModel.logoutUser(req);
      if (!userUpdate.success) return res.status(400).send(Response.failure(400, userUpdate.error));
      return res.status(200).send(Response.success(200, "User logout successfully"))
    } catch (ex) {
      console.error(ex);
      return res.status(400).send(Response.failure(400, ex))
    }
  },
}