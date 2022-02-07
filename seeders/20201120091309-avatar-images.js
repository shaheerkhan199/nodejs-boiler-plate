'use strict';
const { BASE_URL } = require("../startup/config");

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
    //  const sysURL =  new url(BASE_URL)
    await queryInterface.bulkInsert('Avatars', [{
      imageURL: BASE_URL + "/public/uploads/avatar/image_1603890492305_undefined_avatar1.png",
      imageThumbURL: BASE_URL + "/public/uploads/avatar/thumb_1603890492579_undefined_undefined_avatar1.png",
      createdAt: new Date(),
      updatedAt: new Date()
    }, {
      imageURL: BASE_URL + "/public/uploads/avatar/image_1603890511427_undefined_avatar2.png",
      imageThumbURL: BASE_URL + "/public/uploads/avatar/thumb_1603890511990_undefined_undefined_avatar2.png",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      imageURL: BASE_URL + "/public/uploads/avatar/image_1603890518620_undefined_avatar3.png",
      imageThumbURL: BASE_URL + "/public/uploads/avatar/thumb_1603890518909_undefined_undefined_avatar3.png",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      imageURL: BASE_URL + "/public/uploads/avatar/image_1603890526734_undefined_avatar4.png",
      imageThumbURL: BASE_URL + "/public/uploads/avatar/thumb_1603890527075_undefined_undefined_avatar4.png",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      imageURL: BASE_URL + "/public/uploads/avatar/image_1603954129872_undefined_avatar5.png",
      imageThumbURL: BASE_URL + "/public/uploads/avatar/thumb_1603954130340_undefined_undefined_avatar5.png",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      imageURL: BASE_URL + "/public/uploads/avatar/image_1603954142132_undefined_avatar6.png",
      imageThumbURL: BASE_URL + "/public/uploads/avatar/thumb_1603954142424_undefined_undefined_avatar6.png",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      imageURL: BASE_URL + "/public/uploads/avatar/image_1603954149996_undefined_avatar7.jpeg",
      imageThumbURL: BASE_URL + "/public/uploads/avatar/thumb_1603954150023_undefined_undefined_avatar7.jpeg",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      imageURL: BASE_URL + "/public/uploads/avatar/image_1603954157396_undefined_avatar8.jpg",
      imageThumbURL: BASE_URL + "/public/uploads/avatar/thumb_1603954161683_undefined_undefined_avatar8.jpg",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      imageURL: BASE_URL + "/public/uploads/avatar/image_1603954169632_undefined_avatar9.png",
      imageThumbURL: BASE_URL + "/public/uploads/avatar/thumb_1603954169773_undefined_undefined_avatar9.png",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      imageURL: BASE_URL + "/public/uploads/avatar/image_1603954176436_undefined_avatar10.png",
      imageThumbURL: BASE_URL + "/public/uploads/avatar/thumb_1603954178201_undefined_undefined_avatar10.png",
      createdAt: new Date(),
      updatedAt: new Date()
    },

    ]);
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete('Avatars', null, {});
  }
};
