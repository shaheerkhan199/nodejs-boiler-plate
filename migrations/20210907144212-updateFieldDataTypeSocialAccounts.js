'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    queryInterface.changeColumn('socialAccounts', 'socialId', {
      type: Sequelize.TEXT,
      allowNull: true,
    })
  },

  down: async (queryInterface, Sequelize) => {
    queryInterface.changeColumn('socialAccounts', 'socialId', {
      type: Sequelize.STRING,
      allowNull: true,
    })
  }
};
