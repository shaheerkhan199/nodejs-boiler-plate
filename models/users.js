'use strict';
const {
  Model,Sequelize, Op
} = require('sequelize');
const { active,inActive,unverified}= require("../startup/constants")
module.exports = (sequelize, DataTypes) => {
  class users extends Model {

    async getUsers(limit,offset,status,like) {
      
      
      const Op = Sequelize.Op;
      let whereClause = {}
        whereClause = {
          roleId: 1,
          status: {
            [Op.in]: status
          }
        }

        if(like !== "%%")
        {
          whereClause = {
            roleId: 1,
            status: {
              [Op.in]: status
            },
            [Op.or]: [
              Sequelize.where(Sequelize.fn("concat", Sequelize.col("firstName"), ' ', Sequelize.col("lastName")), {
                [Op.like]: like
              }),
             ]
          }
        }
      try {
        const usersRecords = await users.findAndCountAll({
          limit:limit,
          offset:offset,
          raw: true,
          attributes: {
            exclude: ['password']
          },
          where: whereClause
        })
        return usersRecords
      } catch (e) {
        console.error(e)
        return res.status(500).send(handleFailureResponse(500, "Server Error"))
      }
    }
    async getWeeklyUsersStats(startDate, endDate) {
      try {
        const usersRecords = await users.findAndCountAll({
          raw: true,
          attributes: {
            exclude: ['password']
          },
          where: {
            createdAt: {
              [Op.between]: [endDate,startDate]
            }
          }
        })
        return usersRecords
      } catch (error) {
        console.error(error)
        return res.status(500).send(handleFailureResponse(500, "Server Error"))
      }
    }
    async getUsersStats(month, year) {
      const Op = Sequelize.Op;
      let status = [active, inActive];
      let whereClause = {}
      if (month != null && year != null) {
        whereClause = {
          roleId: 1,
          status: {
            [Op.in]: status,
          },
          [Op.and]: [{
            createdAt: Sequelize.where(Sequelize.fn("month", Sequelize.col("createdAt")), month)
          },
          {
            createdAt: Sequelize.where(Sequelize.fn("year", Sequelize.col("createdAt")), year)
          }
          ]
        }
      } else {
        whereClause = {
          roleId: 1,
          status: {
            [Op.in]: status
          }
        }
      }
      try {
        const usersRecords = await users.findAndCountAll({
          raw: true,
          attributes: {
            exclude: ['password']
          },
          where: whereClause
        })
        return usersRecords
      } catch (e) {
        console.error(e)
        return res.status(500).send(handleFailureResponse(500, "Server Error"))
      }
    }
    /** 
     * this function is use for get user count with respect to month and year
    * @param {number} startMonth 
    * @param {number} endMonth 
    * @param {number} startYear 
    * @param {number} endYear 
    */

    async getMonthlyAppCount(startMonth, endMonth, startYear, endYear){
      const Op = Sequelize.Op;
     let response = {};
     const monthName = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December'
      ];
    try{
      if (startYear < endYear) {
          let range1 = (12 - startMonth) + 1;
          for (var i = startMonth; i <= (startMonth - 1) + range1; i++) {
               
           let app_count1   = await users.findAndCountAll({
                          attributes: {
                            exclude: ['password']
                          },
                          where: {
                            roleId: 1,
                            [Op.and]: [{
                              createdAt: Sequelize.where(Sequelize.fn("month", Sequelize.col("createdAt")), i)
                            },
                            {
                              createdAt: Sequelize.where(Sequelize.fn("year", Sequelize.col("createdAt")), startYear)
                            }
                            ]
                          }
                        })
                        response[monthName[i - 1] + "," + startYear] = app_count1.count;
          }
          for (i = 1; i <= endMonth; i++) {
            let  app_count2 = await users.findAndCountAll({
                attributes: {
                  exclude: ['password']
                },
                where: {
                  roleId: 1,
                  [Op.and]: [{
                    createdAt: Sequelize.where(Sequelize.fn("month", Sequelize.col("createdAt")), i)
                  },
                  {
                    createdAt: Sequelize.where(Sequelize.fn("year", Sequelize.col("createdAt")), endYear)
                  }
                  ]
                }
              });
              response[monthName[i - 1] + "," + endYear] = app_count2.count;
          }
      } else {
          for (var i = startMonth; i <= endMonth; i++) {
            let  app_count = await users.findAndCountAll({
                attributes: {
                  exclude: ['password']
                },
                where: {
                  roleId: 1,
                  [Op.and]: [{
                    createdAt: Sequelize.where(Sequelize.fn("month", Sequelize.col("createdAt")), i)
                  },
                  {
                    createdAt: Sequelize.where(Sequelize.fn("year", Sequelize.col("createdAt")), startYear)
                  }
                  ]
                }
              });
            //  var key = 
             response[monthName[i - 1] + "," + startYear] = app_count.count;
              // response.push({key : app_count.count});
          }
      }
        return response
      } catch (e) {
        console.error(e)
        return res.status(500).send(handleFailureResponse(500, "Server Error"))
      }
  }  
  /**
  * This function is used to get user with userId
  * @param userId 
  * @return {object}
  */
   async userByEmail(email) {
     try {
       const userRecord = await users.findOne({
         where: {
             email: email,
         }
       })
       if (!userRecord) return {
         success: false,
         error: "Account not found"
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
           status: userRecord.status,
           deviceToken: userRecord.deviceToken
         }
       }
     } catch (e) {
       return {
         success: false,
         error: `Error Occured ${e} `
       }
     }
   }
   /**
  * This function is used to get user with roleId
  * @param roleId 
  * @return {object}
  */
    async userByRoleId(roleId) {
      try {
        const userRecord = await users.findOne({
          where: {
            roleId: roleId,
          }
        })
        if (!userRecord) return {
          success: false,
          error: "Account not found"
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
            status: userRecord.status,
            deviceToken: userRecord.deviceToken
          }
        }
      } catch (e) {
        return {
          success: false,
          error: `Error Occured ${e} `
        }
      }
    }
  /**
   * This function is used to get user with userId
   * @param userId 
   * @return {object}
   */
    async userById(userId) {
      try {
        const userRecord = await users.findOne({
          where: {
              id: userId,
          }
        })
        if (!userRecord) return {
          success: false,
          error: "Account not found"
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
            status: userRecord.status,
            deviceToken: userRecord.deviceToken,
            enableNotifications: userRecord.enableNotifications,
          }
        }
      } catch (e) {
        return {
          success: false,
          error: `Error Occured ${e} `
        }
      }
    }
    async editUser(req){
      try {
        const userUpdate = await users.update({
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          imageUrl: req.body.imageUrl,
          imageThumbUrl: req.body.imageThumbUrl,
        },{
          where:{
            id: req.user.data.id
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
    async editUserProfileImage(req,imagePath, imageThumbPath){
      try {
        const userUpdate = await users.update({
          imageUrl: imagePath,
          imageThumbUrl: imageThumbPath
        },{
          where:{
            id: req.user.data.id
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
    async updateUserBio(req){
      try {
        const userUpdate = await users.update({
          bio: req.body.bio,
          bioImageUrl: req.body.bioImageURL,
          bioImageThumbUrl: req.body.bioImageThumbURL,
          isDottedBioImage: Number(req.body.isDottedBioImage)
        },{
          where:{
            id: req.user.data.id
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
    async updateUserStatus(req){
      try {
        const userUpdate = await users.update({
          status: req.body.status
        },{
          where:{
            id: req.params.id
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
    async logoutUser(req){
      try {
        const userUpdate = await users.update({
          deviceToken: null
        },{
          where:{
            id: req.params.id
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
    async deleteDeviceToken(req){
      try {
        const userUpdate = await users.update({
          deviceToken: null,
          enableNotifications: false
        },{
          where:{
            id: req.user.data.id
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
    async addDeviceToken(req){
      try {
        const userUpdate = await users.update({
          deviceToken: req.body.deviceToken,
          enableNotifications: true
        },{
          where:{
            id: req.user.data.id
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
    async deleteUser(req){
      try {
        const deletedUser = await users.destroy({
          where:{
            id: req.user.data.id
          }
        })
        return {
          user: deletedUser,
          success: true,
        }
      } catch (ex) {
        return {
          success: false,
          error: `Error occured while deleting user reason: ${ex}`
        }
      }
    }
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    
    static associate(models) {
      // define association here
      
    }
  };

  users.init({
    roleId: DataTypes.INTEGER,
    userName: DataTypes.STRING,
    email: DataTypes.STRING,
    verifyCode: DataTypes.STRING,
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    password: DataTypes.STRING,
    deviceToken: DataTypes.STRING,
    resetToken: DataTypes.STRING,
    resetExpiry: DataTypes.DATE,
    lastLogin: DataTypes.DATE,
    imageUrl: DataTypes.TEXT,
    imageThumbUrl: DataTypes.TEXT,
    status: DataTypes.INTEGER,
    bio: DataTypes.STRING,
    bioImageUrl: DataTypes.STRING,
    bioImageThumbUrl: DataTypes.STRING,
    isDottedBioImage: DataTypes.BOOLEAN,
    enableNotifications: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'users',
  });
  return users;
};