import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import { ApiResponse } from "../utils/apiResponse.js" 
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body;

    if(!content || !content.trim()) {
        throw new ApiError(400, "Tweet content is required")
    }

    // create tweet
    const tweet = await Tweet.create({
        content: content.trim(),
        owner: req.user._id
    })

    if(!tweet) {
        throw new ApiError(500," Failed to create tweet")
    }

    return res.status(200).json(
        new ApiResponse (200, tweet, "Tweet created successfully")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params;

    if(!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const {page = 1, limit = 10 } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.max(1, parseInt(page, 10) || 10);
    const skip = (pageNumber - 1) * limitNumber;

    // get all tweets by the user

    const tweets = await Tweet.find({owner: userId})
    .populate("owner", "username fullName avatar" )
    .sort({createdAt: -1})
    .skip(skip)
    .limit(limitNumber);

    // count total user tweets
    const totalTweets = await Tweet.countDocuments({
        owner: userId
    });

    return res.status(200).json(
        new ApiResponse (
            200, {
                tweets,
                pagination: {
                    totalTweets,
                    currentPage: pageNumber,
                    totalPages: Math.ceil(totalTweets / limitNumber),
                    limit: limitNumber
                }
            },
            "User tweets fetched successfully"
        )
    )
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const  { tweetId } = req.params;
    
    const { content } = req.body;

    if(!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    if(!content || !content.trim()) {
        throw new ApiError(400, "Tweet content is required");
    }

    const tweet  = await Tweet.findById(tweetId);

    if(!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if(tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "you are not allowed to update this tweet");
    }
    // update tweet content

    tweet.content = content.trim();

    await tweet.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            tweet,
            "Tweet updated successfully"
        )
    );
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params;

    if(!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const tweet  = await Tweet.findById(tweetId);

    if(!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    // check tweet ownership
    if(tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "you are not allowed to delete this tweet");
    }

    await Tweet.findByIdAndDelete(tweetId);

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Tweet deleted successfully"
        )
    );
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}