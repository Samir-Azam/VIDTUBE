import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import jwt from 'jsonwebtoken'
import mongoose from "mongoose";

const generateRefreshAndAcceptToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(500, "User not found.");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(400,"Error in generating the tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullName, password } = req.body;

  // validation
  // 1. is correct username,email, fullName and password is given or not.
  if (
    [username, email, fullName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are mandatory.");
  }

  // 2. is user already exist
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existingUser) {
    throw new ApiError(409, "User with email or username already exists.");
  }

  const avatarLocalPath = req.files?.avatar?.[0].path;
  const coverLocalPath = req.files?.coverImage?.[0].path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing.");
  }

  let avatar;
  try {
    avatar = await uploadOnCloudinary(avatarLocalPath);
    console.log("Uploaded avatar", avatar);
  } catch (error) {
    console.log("Error in uploading avatar", error);
    throw new ApiError(500, "Failed to upload avatar");
  }

  let coverImage;
  try {
    coverImage = await uploadOnCloudinary(coverLocalPath);
    console.log("Uploaded Cover Image", coverImage);
  } catch (error) {
    console.log("Error in uploading coverImage", error);
    throw new ApiError(500, "Failed to upload coverImage");
  }

  try {
    const user = await User.create({
      username: username.toLowerCase(),
      email,
      fullName,
      password,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );
    return res
      .status(201)
      .json(new ApiResponse(201, createdUser, "User registed successfully"));
  } catch (error) {
    console.log("Error in registering the user", error);
    if (avatar) {
      await deleteFromCloudinary(avatar.public_id);
    }
    if (coverImage) {
      await deleteFromCloudinary(coverImage.public_id);
    }
    throw new ApiError(
      500,
      "Something went wrong while registering the user and images are deleted"
    );
  }
});

const loginUser = asyncHandler(async (req,res)=>{
    const {username, email, password} = req.body
    if (!username && !email){
        throw new ApiError(400, "Either email or username is Required")
    }
    const user = await User.findOne(
        {
            $or:[{email},{username}]
        }
    )
    if (!user){
        throw new ApiError(404, "User not found")
    }
    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid){
        throw new ApiError(404, "Invalid credentials")
    }
    const {accessToken, refreshToken} = await generateRefreshAndAcceptToken(user._id)

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!loggedInUser){
        throw new ApiError(404, "User is not Logged In")
    }
    const options = {
        httpOnly:true, 
        secure:process.env.NODE_ENV === "production"
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200,loggedInUser,"User logged in succesfully"))
})

const refreshAccessToken = asyncHandler(async (req,res)=>{
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(400, "No refresh token found")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token")
        }
        if (incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Invalid Refresh Token")
        }

        const options = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
        };
        const {accessToken, refreshToken:newRefreshToken} = await generateRefreshAndAcceptToken(user._id)
        return res
          .status(200)
          .cookie("accessToken", accessToken, options)
          .cookie("refreshToken", newRefreshToken, options)
          .json(
            new ApiResponse(200, 
                {accessToken,
                refreshToken:newRefreshToken
            } , 
            "Access token refreshed successfully")
          );
    } catch (error) {
        throw new ApiError(500, "Something went wrong while refreshing token")
    }
})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(req.user._id,
      {
        $set:{
          refreshToken: undefined,
        }
      },
      {new:true}
    )

    const options = {
      httpOnly:true,
      secure:process.env.NODE_ENV==='production'
    }

    return res
      .status(200)
      .clearCookie("accessToken",options)
      .clearCookie("refreshToken",options)
      .json(new ApiResponse(200,{}, "User logged out successfully"))
      
})

const changePassword = asyncHandler(async(req, res)=>{
  // need to grab the oldPassword and then  i can change it and save it
  const {oldPassword,newPassword} = req.body
  if (!oldPassword || !newPassword){
    throw new ApiError(400, "All the fields are mandatory")
  }
  try {
    const user = await User.findById(req?.user._id)
    const validPassword = await user.isPasswordCorrect(oldPassword)
    if (!validPassword){
      throw new ApiError(401, "Entered Password is Incorrect")
    }
    user.password = newPassword
    await user.save({validateBeforeSave:false})
    return res
    .status(200)
    .json(new ApiResponse(200, null, "Password changed successfully"))
  } catch (error) {
    throw new ApiError(401, "Something went wrong try again later")
  }
})


const getCurrentUser = asyncHandler(async(req, res)=>{
  
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User details"))
})


const updateAccountDetails = asyncHandler(async(req, res)=>{
  const {username, email} = req.body
  if (!username || !email){
    throw new ApiError(400, "Both username and email is required")
  }
  const existedUser = await User.findOne({
    _id:{$ne:req.user._id},
    $or:[{email},{username}]
  })
  if (existedUser){
    throw new ApiError(400, "Email or Password is already used")
  }
  try {
    const user = await User.findByIdAndUpdate(req.user._id,
      {
        $set:{
          username,
          email,
        }
      },
      {new:true,
        runValidators:true
      }
    ).select("-password -refreshToken")
  
    return res
      .status(200)
      .json(new ApiResponse(200, user, "Updated user details"))
  } catch (error) {
    throw new ApiError(400, "Failed updating the details try later")
  }
})

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path

  if (!avatarLocalPath){
    throw new ApiError(400, "Upload avatar")
  }
  let avatar
  try {
    avatar = await uploadOnCloudinary(avatarLocalPath)
    console.log("Avatar uploaded on cloudinary")
  } catch (error) {
    throw new ApiError(400, "Avatar Upload Failed")
  }

  const user = await User.findByIdAndUpdate(req.user._id,
    {$set:{avatar:avatar.url}},
    {new:true}
  ).select("-password -refreshToken")

  if (!user){
    throw new ApiError(404, "Failed Avatar Updation")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Avatar Updated successfully"))

});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverLocalPath = req.file?.path
  if (!coverLocalPath){
    throw new ApiError(400, "Upload Cover Image")
  }
  let coverImage;

  try {
    coverImage = await uploadOnCloudinary(coverLocalPath)
    console.log("Cover Image is Uploaded on cloudinary")
  } catch (error) {
    throw new ApiError(400, "Failed Uploading the Cover Image")
  }

  if (!coverImage || !coverImage.url){
    throw new ApiError(400, "Cover Image can't be updated right now")
  }

  const user  = await User.findByIdAndUpdate(req.user._id,
    {
      $set:{
        coverImage:coverImage.url
      }
    },
    {new:true}
  ).select("-password -refreshToken")

  if (!user){
    throw new ApiError(400, "Something went wrong try later")
  }
  return res
    .status(200)
    .json(new ApiResponse(200, null,"Cover Image is Updated"))
});

const getUserChannelProfile = asyncHandler(async(req,res)=>{

  const username = req.params.username?.toLowerCase()
  if (!username){
    throw new ApiError(400, "Username is required")
  }

  const channel = await User.aggregate(
    [
      {
        $match:{
        username:username
        }
      },
      {
        $lookup:{
          from:"subscriptions",
          localField:"_id",
          foreignField:"channel",
          as:"subscribers"
        }
      },
      {
        $lookup:{
          from:"subscriptions",
          localField:"_id",
          foreignField:"subscriber",
          as:"subscribedTo"
        }
      },
      {
        $addFields:{
          subscriberCount:{
            $size:"$subscribers"
          },
          channelSubscribeToCount:{
            $size:"$subscribedTo"
          },
          isSubscribed:{
            $cond:{
              $if:{
                $in:[req.user?._id,"$subscribers.subscriber"]
              },
              then: true,
              else: false
            }
          }
        }
      },
      {
        // Project only the necessary data
        $project:{
          username:1,
          fullname:1,
          avatar:1,
          subscriberCount:1,
          channelSubscribeToCount:1,
          isSubscribed:1,
          email:1
        }
      }
    ]
  )

  if (!channel?.length){
    throw new ApiError(404, "Channel not found")
  }
  
  return res.status(201).json(new ApiResponse(201, channel[0], "User details"))
})


const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "history",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, user[0]?.history || [], "Watch History fetched successfully")
    );
});


export {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  changePassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
