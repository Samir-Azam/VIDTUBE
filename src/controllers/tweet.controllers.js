import { ApiError } from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import {Tweet} from '../models/tweet.models.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import mongoose from 'mongoose'

const createTweet = asyncHandler(async (req, res)=>{
    const {content} = req.body

    if (!content || !content.trim()){
        throw new ApiError(400, "Content is required")
    }

    const owner = req.user?._id
    if (!owner){
        throw new ApiError(400, "Something went wrong")
    }

    const tweet = await Tweet.create(
        {
            content:content.trim(),
            owner
        }
    )

    return res
      .status(201)
      .json(new ApiResponse(201, tweet, "Tweet successfully posted"));
    
})

const deleteTweet = asyncHandler(async (req, res)=>{
    const {tweetId} = req.params

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    if (tweet.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You are unauthorized to delete this tweet")
    }

    await tweet.deleteOne()

    return res
        .status(200)
        .json(new ApiResponse(200,{}, "Tweet deleted successfully"))
})

const updateTweet = asyncHandler(async (req, res)=>{
    const {content} = req.body
    const {tweetId} = req.params

    if (!content?.trim()){
        throw new ApiError(400, "Content is required")
    }

    const tweet = await Tweet.findById(tweetId)

    
    if (!tweet){
        throw new ApiError(400, "Tweet not found")
    }
    
    if (tweet.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400, "Can't edit other tweet")
    }
    tweet.content = content.trim()
    await tweet.save({validateBeforeSave: false})

    return res
      .status(200)
      .json(new ApiResponse(200, tweet, "Tweet successfully updated"));
})

const viewAllTweet = asyncHandler(async (req, res)=>{
    const userId  = req.user?._id
    if (!userId){
        throw new ApiError(400, "Something went wrong")
    }
    const tweets = await Tweet.aggregate([
        {$match:{
            owner: new mongoose.Types.ObjectId(userId)
        }},
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"tweetDetails"
            }
        },
        {
            $unwind:"$tweetDetails"
        },
        {
            $project:{
                username: "$tweetDetails.username",
                createdAt :1,
                updatedAt :1,

                content:1
            }
        },
        {
            $sort: {
                createdAt: -1  
            }
        }
    ])
    if (tweets.length === 0){
        throw new ApiError(404, "Tweets not Found")
    }
    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "Tweets Fetched Successfully"))
})


export {createTweet, updateTweet, deleteTweet, viewAllTweet}