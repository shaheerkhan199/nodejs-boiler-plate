const express = require("express");
const router = express.Router();
const authController = require('../../controllers/auth');
const UploadFile = require("../../services/UploadFiles");
const uploads = UploadFile.uploadImage()
const auth = require("../../middlewares/auth")
const isBanned = require("../../middlewares/isBanned")

/**
 * Below route is used to register a user in web app
 * it @returns x-auth-token in headers where as user basic info in body of the response
 */
/**
 *This route is use to create avatar images for signup process
 */
router.post("/avatar", uploads.single("image"), authController.createAvatar);
/**
 *This route is use to get avatar images for signup process
 */
router.get("/avatar", authController.getAvatar);

router.post("/signup", authController.signup);

router.patch("/finishSignup/:id", authController.finishSignup);

router.post("/isexists", authController.isExists);
/**
 *This route is use to login or signup with social auth
 */
router.post("/social", uploads.single("image"), authController.signupSocial);
/**
 *This route is use to login a user
 */
router.post("/login", authController.login);
/**
 * This route is use to send verificatin code to the email for changing password
 */
router.post("/forget-password", authController.forgetPassword);
/**
 * This route is use to verify token
 */
router.post("/verify-token", authController.verifyToken);
/**
 * This route is use to update password
 */
router.post("/change-password", authController.resetPassword);

router.post("/update-password", auth, isBanned, authController.changePassword);

module.exports = router;