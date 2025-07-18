import {Router} from 'express'
import { verifyJWT } from '../middlewares/auth.middlewares.js'
import { createTweet, deleteTweet, updateTweet, viewAllTweet } from "../controllers/tweet.controllers.js";

const router = Router()

router.route("/create").post(verifyJWT, createTweet)
router.route("/update/:tweetId").patch(verifyJWT, updateTweet)
router.route("/delete/:tweetId").patch(verifyJWT, deleteTweet)
router.route("/my-tweet").get(verifyJWT, viewAllTweet);

export default router;