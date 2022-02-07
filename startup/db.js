const {
    db
} = require("./config")
const Sequelize = require("sequelize");
module.exports = function () {
    const sequelize = new Sequelize("tickfilm", db.DB_USER, process.env.NODE_ENV == "development" ? db.PASSWORD_DEV : db.PASSWORD_PROD, {
        dialect: "mysql"
    });
    sequelize
        .authenticate()
        .then(() => {
            console.log("Connection established successfully.");
        })
        .catch(err => {
            console.error("Unable to connect to the database:", err);
        })
        .finally(() => {
            sequelize.close();
        });
}