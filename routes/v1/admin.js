const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth")
const isAdmin = require("../../middlewares/isAdmin")
const userController = require("../../controllers/users")

/**
 * This route is use to bring count of banned active and premium users
 */
router.get("/user-stats", auth, isAdmin, userController.userStats)

/**
 * This route is use to bring app download count
 */
router.get("/app-download-count", auth, isAdmin, userController.appDownloadCount)

router.get("/users", auth, isAdmin, userController.allUsers)

router.put("/users/:id", auth, isAdmin, userController.updateUserStatus)

router.get("/messages", auth, isAdmin, userController.getUserAdminMessages)

router.delete("/report/:id", auth, isAdmin, userController.deleteUserAdminMessages)

router.post("/report/reply/:id", auth, isAdmin, userController.replyUserAdminMessages)

router.delete("/flag/:id", auth, isAdmin, userController.deleteFlagReport)

router.get("/flag", auth, isAdmin, userController.getFlagUsers)

router.get("/notifications", auth, isAdmin, userController.adminNotifications)

module.exports = router