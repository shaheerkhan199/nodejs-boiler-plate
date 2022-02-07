'use strict';
const bcrypt = require("bcryptjs")
module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */
    const password = "adminTickFilm"
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    await queryInterface.bulkInsert('users', [{
      roleId: 2,
      userName: 'admin',
      email: 'admintickfilm@yopmail.com',
      verifyCode: '',
      firstName: 'tickfilm',
      lastName: 'admin',
      password: hashed,
      deviceToken: "",
      resetToken: "",
      restExpiry: null,
      lastLogin: new Date(),
      imageUrl: "",
      imageThumbUrl: "",
      status: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  }
};
