const {
  db
} = require("../startup/config")
module.exports = {
  "development": {
    "username": db.DB_USER,
    "password": db.PASSWORD_DEV,
    "database": db.DB_NAME,
    "host": "localhost",
    "dialect": "mysql"
  },
  "staging": {
    "username": db.DB_USER,
    "password": db.PASSWORD_DEV,
    "database": db.DB_NAME,
    "host": "localhost",
    "dialect": "mysql"
  },
  "production": {
    "username": db.DB_USER,
    "password": db.PASSWORD_PROD,
    "database": db.DB_NAME,
    "host": "localhost",
    "dialect": "mysql"
  }
}
