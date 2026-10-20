import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    
    if(!mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, "invalid channel Id");
    }

    // prevent subscribing to your own channel
    if(channelId.toString() === req.user._id.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel");
    } 

    const channel = await User.findById(channelId);

    if(!channel) {
        throw new ApiError(404, "Channel not found");
    }

    // check existing subscription
    const existingSubscription = await Subscription.findOne({
        subscriber: req.user._id,
        channel: channelId
    });

    // If already subscribed , unsubscribe
    if(existingSubscription) {
        await Subscription.findByIdAndDelete(existingSubscription._id);

        return res.status(200).json(
            new ApiResponse(
                200,
                { isSubscribed: false },
                "Channel unsubscribed successfully"
            )
        );
    }

    // Otherwise , create subscription
    await Subscription.create({
        subscriber: req.user._id,
        channel: channelId
    })

     return res.status(200).json(
        new ApiResponse(
            200,
            { isSubscribed: true },
            "Channel subscribed successfully"
        )
    );
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if (!mongoose.isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    // 2. Check whether the channel exists
    const channel = await User.findById(channelId);

    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    // 3. Get pagination details
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNumber - 1) * limitNumber;

    // 4. Get subscribers of the channel
    const subscribers = await Subscription.find({
        channel: channelId
    })
        .populate("subscriber", "username fullName avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);

    // 5. Count total subscribers
    const totalSubscribers = await Subscription.countDocuments({
        channel: channelId
    });

    
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                subscribers,
                pagination: {
                    totalSubscribers,
                    currentPage: pageNumber,
                    totalPages: Math.ceil(totalSubscribers / limitNumber),
                    limit: limitNumber
                }
            },
            "Channel subscribers fetched successfully"
        )
    );
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!mongoose.isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber ID");
    }

    // 2. Check whether the user exists
    const user = await User.findById(subscriberId);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // 3. Get pagination details
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNumber - 1) * limitNumber;

    // 4. Get channels subscribed to by this user
    const subscriptions = await Subscription.find({
        subscriber: subscriberId
    })
        .populate("channel", "username fullName avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);

    // 5. Extract channel details
    const channels = subscriptions
        .filter((subscription) => subscription.channel)
        .map((subscription) => subscription.channel);

    // 6. Count total subscriptions
    const totalSubscriptions = await Subscription.countDocuments({
        subscriber: subscriberId
    });

    // 7. Return response
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                channels,
                pagination: {
                    totalSubscriptions,
                    currentPage: pageNumber,
                    totalPages: Math.ceil(totalSubscriptions / limitNumber),
                    limit: limitNumber
                }
            },
            "Subscribed channels fetched successfully"
        )
    );
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}