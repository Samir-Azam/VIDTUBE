import { Router } from "express";
import { 
  registerUser, 
  logoutUser, 
  loginUser, 
  getWatchHistory, 
  getUserChannelProfile, 
  updateAvatar,
  updateCoverImage,
  updateAccountDetails,
  getCurrentUser,
  changePassword,
  refreshAccessToken} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middlerwares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
const router = Router();

// unsecured routes

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser)

router.route("/refresh-token").patch(refreshAccessToken)

// secured routes
router.route('/logout').post(verifyJWT, logoutUser)

router.route("/watch-history").get(verifyJWT, getWatchHistory)
router.route("/channel/:username").get(verifyJWT, getUserChannelProfile)

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar)
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

router.route("/update-details").patch(verifyJWT, updateAccountDetails)

router.route("/current-user").get(verifyJWT, getCurrentUser)

router.route("/change-password").patch(verifyJWT, changePassword)

export default router;
