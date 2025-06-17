import {ApiResponse} from "../utiles/ApiResponse.js"
import asyncHandler from "../utiles/asyncHandler.js"

const healthcheck = asyncHandler(async (req,res)=>{
    res.status(200).json(new ApiResponse(200, "OK", "Healthcheck is done successfully "))
})

export default healthcheck