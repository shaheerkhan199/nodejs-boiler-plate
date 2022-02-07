const authRoute = require("../routes/v1/auth");
const usersRoute = require("../routes/v1/user");
const adminRoute = require("../routes/v1/admin");
const { projectFolderName } = require("./constants");

module.exports = function (app) {
    app.use(`/dev/${projectFolderName}/api/v1/auth`, authRoute);
    app.use(`/dev/${projectFolderName}/api/v1/user`, usersRoute);
    app.use(`/dev/${projectFolderName}/api/v1/admin`, adminRoute);
};