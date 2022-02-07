'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Avatar extends Model {
    async getAvatar() {
      try {
        const record = await Avatar.findAll()
        if (!record) return {
          success: false,
          error: "No Avatar Found"
        }
        return {
          success: true,
          avatar: record
        }
      } catch (e) {
        return {
          success: false,
          error: `Error Occured ${e} `
        }
      }
    }

    async createAvatarRecord(imageURL,imageThumbURL) {
      try { 
        const avatarCreated = await Avatar.create({
          imageURL: imageURL,
          imageThumbURL: imageThumbURL
        })
        return {
          avatar: avatarCreated,
          success: true,
        }
      } catch (ex) {
        return {
          success: false,
          error: `Error occured while creating reason: ${ex}`
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
  Avatar.init({
    imageURL: DataTypes.STRING,
    imageThumbURL: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Avatar',
  });
  return Avatar;
};