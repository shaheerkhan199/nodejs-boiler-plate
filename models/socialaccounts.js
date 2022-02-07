'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SocialAccounts extends Model {
      /**
   * This function is used to check weather the user socail account have exist or not
   * @param {object} socialAccount 
   * @return token
   */
  async isSocialAccount(socialId, platform) {
    try {
      const record = await SocialAccounts.findOne({
        where: {
            socialId: socialId,
            platform: platform
        }
      })
      if (!record) return {
        success: false,
        error: "Account not found"
      }

      return {
        success: true,
        user: {
          id: record.id,
          userid: record.userId,
        }
      }
    } catch (e) {
      return {
        success: false,
        error: `Error Occured ${e} `
      }
    }
  }
  async createSocialAccount(req,users) {
    try { 
      const accountCreated = await SocialAccounts.create({
        userId: users.id,
        socialId: req.body.socialId,
        platform: req.body.platform,
        status: req.body.status,
      })
      return {
        user: accountCreated,
        success: true,
      }
    } catch (ex) {
      return {
        success: false,
        error: `Error occured while creating social account reason: ${ex}`
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
  SocialAccounts.init({
    userId: DataTypes.INTEGER,
    socialId: DataTypes.STRING,
    platform: DataTypes.STRING,
    token: DataTypes.STRING,
    status: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'socialAccounts',
  });
  // const socialAccount = new SocialAccounts();
  // socialAccount.isSocialAccount
  return SocialAccounts;
};