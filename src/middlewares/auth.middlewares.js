import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken";

const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized. Token missing.");
  }

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid or expired token.");
  }
});

export { verifyJWT };
