import mongoose, {isValidObjectId, mongo} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import { ApiResponse } from "../utils/apiResponse.js" 
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import {Tweet} from "../models/tweet.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video

    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video Id")
    }

    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    // check whether the user has already liked this video
    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user._id
    });

    // if already liked , remove the like
    if(existingLike) {
        await Like.findByIdAndDelete(existingLike._id);

        return res.status(200)
        .json( new ApiResponse(200,
            {isLiked: false},
            "Video unliked successfully"
        ))
    }

    // otherwise , create a new like
    await Like.create({
        video: videoId,
        likedBy: req.user._id
    })

    return res.status(200).json(
        new ApiResponse(200,
            {isLiked: true},
            "Video liked successfully"
        )
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment

    if(!mongoose.isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment ID")
    }

    const comment  = await Comment.findById(commentId);

    if(!comment) {
        throw new ApiError(404, "Comment not found")
    }

    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user._id
    });

    if(existingLike) {
        await Like.findByIdAndDelete(existingLike._id);

        return res.status(200).json(
            new ApiResponse(
                200,
                { isLiked: false },
                "Comment unliked successfully"
            )
        );
    }

     await Like.create({
        comment: commentId,
        likedBy: req.user._id
    });

     return res.status(200).json(
        new ApiResponse(
            200,
            { isLiked: true },
            "Comment liked successfully"
        )
    );

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet Id");
    }

    const tweet = await Tweet.findById(tweetId);
    if(!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user._id
    })

    if(existingLike) {
        await Like.findByIdAndDelete(existingLike._id);

        return res.status(200)
    .json(
        new ApiResponse(200,
            {isLiked: false},
            "Tweet unliked successfully"
        )
    )
    }

    await Like.create({
        tweet: tweetId,
        likedBy: res.user._id
    })


     return res.status(200).json(
        new ApiResponse(
            200,
            { isLiked: true },
            "Tweet liked successfully"
        )
    );
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req.user._id;

    // pagination
    const {page = 1, limit = 10} = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.max(1, parseInt(page, 10) || 1);
    const skip = (pageNumber -1 ) * limitNumber;
 
    // find all video liked by the user
    const likes = await Like.find({
        likedBy: userId,
        video: {$exists: true, $ne: null}
    })
    .sort({createdAt: -1})
    .skip(skip)
    .limit(limitNumber)
    .populate({
        path: "video",
        populate: {
            path: "owner",
            select: "username fullname avatar"
        }
    });

    // Extract videos from the likes
    const videos = likes
    .filter((like) => like.video)
    .map((like) => like.video)

    // Count total liked video
    const totalLikes = await Like.countDocuments({
        likedBy: userId,
        video: {$exists: true,$ne: null}
    })

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                videos,
                pagination: {
                    totalVideos: totalLikes,
                    currentPage: pageNumber,
                    totalPages: Math.ceil(totalLikes / limitNumber),
                    limit: limitNumber
                }
            },
            "Liked videos fetched successfully"
        )
    );

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}