const dotenv = require('dotenv');
dotenv.config();
module.exports = {
  PORT: process.env.PORT,
  jwtPrivateKey: process.env.jwtPrivateKey,
  BASE_URL: process.env.BASE_URL,
  db: {
    DB_USER: process.env.DB_USER,
    DB_NAME: process.env.DB_NAME,
    PASSWORD_PROD: process.env.PASSWORD_PROD,
    PASSWORD_DEV: process.env.PASSWORD_DEV,
  },
  mail: {
    MAIL_HOST: process.env.MAIL_HOST,
    MAIL_SERVICE: process.env.MAIL_SERVICE,
    MAIL_USER: process.env.MAIL_USER,
    MAIL_PASSWORD: process.env.MAIL_PASSWORD,
    MAIL_FROM: process.env.MAIL_FROM,
    MAIL_PORT: process.env.MAIL_PORT,
  },

}