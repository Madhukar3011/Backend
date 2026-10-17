import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query;

    // validate videoId
    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    // check if video exists
    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "video not found")
    }

    // pagination 
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.min(
        100,
        Math.max(1, parseInt(limit, 10) || 10)
    );
    const skip = (pageNumber -1) * limitNumber;

    // Get comments and total count
    const [comments, totalComments] = await Promise.all([
        Comment.find({ video: videoId})
        .populate("owner","username fullName avatar")
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limitNumber),

        Comment.countDocuments({video: videoId})
    ]);

    return res.status(200)
    .json(new ApiResponse(200, {
        comments,
        totalComments,
        currentPage: pageNumber,
        totalPages: Math.ceil(totalComments / limitNumber),
        limit: limitNumber
    },
    "Comments fetched successfully"
))

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const  {videoId} = req.params;
    const {content}= req.body;

    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    if(!content?.trim()) {
         throw new ApiError(400, "Comment content is required");
    }

    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    // create comment
    const comment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner: req.user._id
    });

    // Get comment with owner details
    const createdComment = await Comment.findById(comment._id)
    .populate("owner", "username fullName avatar")

    return res.status(200).json(
        new ApiResponse(
            200,
            createdComment,
            "Comment added successfully"
        )
    );
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params;
    const {content} = req.body;

     if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    if(!content?.trim()) {
         throw new ApiError(400, "Comment content is required");
    }

    const comment = await Comment.findById(commentId);

    if(!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // check comment ownership 
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403,
            "You are not authorized to update this comment");
    }

    // update comment
    comment.content = content.trim();
    await comment.save();

    return res.status(200)
    .json(new ApiResponse(200,
        comment,
        "Comment update successfully"
    ))

})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params;

    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(
            403,
            "You are not authorized to delete this comment"
        );
    }

     await Comment.findByIdAndDelete(commentId);

     return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Comment deleted successfully"
        )
    );
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }