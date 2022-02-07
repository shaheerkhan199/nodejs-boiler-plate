const express = require("express");
const router = express.Router();
const auth = require("../../middlewares/auth")
const isBanned = require("../../middlewares/isBanned")
const UploadFile = require("../../services/UploadFiles")
const uploads = UploadFile.uploadImage()
const userController = require("../../controllers/users")

router.put("/update", auth, isBanned, userController.updateUser)

router.patch("/updateImage", auth, isBanned, uploads.single("image"), userController.updateUserImage)

router.get("/profile/:id", auth, isBanned, userController.userProfile)

router.post("/profile", auth, isBanned, userController.deleteUserProfile)

router.post("/delete-profile-request", auth, isBanned, userController.deleteUserProfileRequest)

router.get("/notifications", auth, isBanned, userController.userNotifications)

router.post("/report", auth, isBanned, userController.createUserAdminMessages)

router.post("/flag", auth, isBanned, userController.createFlagUser)

router.post("/logout/:id", auth, isBanned, userController.logoutUser)

module.exports = router;