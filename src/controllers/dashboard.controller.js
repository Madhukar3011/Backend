import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import { ApiResponse } from "../utils/apiResponse.js" 
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userId = req.user._id;

    //Get total videos and total views 
    const videoStats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: null,
                totalVideos: {$sum: 1},
                totalViews: {$sum: "$views"}
            }
        }
    ]);

    // get total subscribers
    const subscriberStats = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: null,
                totalSubscribers: {$sum: 1}
            }
        }
    ]);

    // get total likes on the channel's videos
    const videoIds = await Video.find(
        {owner: userId},
        { _id: 1}
    );

    const videoIdList = videoIds.map((video) => video._id);

    const likeStats = await Like.aggregate([
        {
            $match: {
                video: {$in: videoIdList }
            }
        },
        {
            $group: {
                _id: null,
                totalLikes: {$sum: 1}
            }
        }
    ]);

    // prepare channel statistics

    const stats = {
        totalVideos: videoStats[0]?.totalVideos || 0,
        totalViews:  videoStats[0]?.totalViews || 0,
        totalSubscribers: subscriberStats[0]?.totalSubscribers || 0,
        totalLikes: likeStats[0]?.totalLikes || 0
    };


     return res
        .status(200)
        .json(new ApiResponse(200, stats, "Channel stats fetched successfully"));
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const userId = req.user.Id;

    // pagination 
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.max(1, parseInt(page, 10) || 1);
    const skip = (pageNumber - 1) * limitNumber;

    // all video uploaded by the channel owner
    const videos = await Video.find({owner: userId})
    .sort({createdAt: -1})
    .skip(skip)
    .limit(limitNumber)
    .populate("owner", "username fullName avatar");

    // total number of videos
    const totalVideos =    await Video.countDocuments({owner: userId});

    return res.status(200)
    .json(new ApiResponse(
        200,
        {
            videos,
            pagination: {
                totalVideos,
                currentPage: pageNumber,
                totalPages: Math.ceil(totalVideos / limitNumber),
                limit: limitNumber
            }
        },
        "channel video fetched successfully" 
    ))
})

export {
    getChannelStats, 
    getChannelVideos
    }