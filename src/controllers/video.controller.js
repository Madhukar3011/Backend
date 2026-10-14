import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query
    //TODO: get all videos based on query, sort, pagination
     // Search filter
    const filter = {};

    if (query?.trim()) {
        filter.$or = [
            { title: { $regex: query.trim(), $options: "i" } },
            { description: { $regex: query.trim(), $options: "i" } }
        ];
    }

    // Filter videos by user
    if (userId) {
        filter.owner = userId;
    }

    // Pagination
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.min(
        100,
        Math.max(1, parseInt(limit, 10) || 10)
    );
    const skip = (pageNumber - 1) * limitNumber;

    // Sorting
    const allowedSortFields = [
        "createdAt",
        "updatedAt",
        "title",
        "views"
    ];

    const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "createdAt";

    const sortOrder =
        sortType.toLowerCase() === "asc" ? 1 : -1;

    const sortOptions = {
        [sortField]: sortOrder
    };

    // Fetch videos and total count
    const [videos, totalVideos] = await Promise.all([
        Video.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNumber),

        Video.countDocuments(filter)
    ]);

    // Response
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                videos,
                totalVideos,
                currentPage: pageNumber,
                totalPages: Math.ceil(totalVideos / limitNumber),
                limit: limitNumber
            },
            "Videos fetched successfully"
        )
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    if(!title || !description) {
        throw new ApiError(400, "Title and description are required");
    }
    // get video and thumbnail paths
    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if(!videoLocalPath) {
        throw new ApiError(400, "video file is required");
    }

    // upload video and  thumbnail to Cloudinary
    const videoFile = await uploadOnCloudinary(videoLocalPath);
    const thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath);

    if(!videoFile) {
        throw new ApiError(500, "Video upload failed")
    }
    if(!thumbnailFile) {
        throw new ApiError(500, "Thumbnail upload failed")
    }

    // Create video in database
     const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: "thumbnailFile.url",
        duration: videoFile.duration,
        owner: req.user._id
     });

     return res.status(200)
     .json(new ApiResponse(200, video,"Video publish successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    // validate videoId
    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    // get video by Id
    const video = await Video.findById(videoId)
    .populate("owner", "username fullname avatar");

    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    return res.status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const {title, description} = req.body;
    //TODO: update video details like title, description, thumbnail
    
    // validate videoId
    if (!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video Id")
    }

    // find video
    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "Video not found");
    }

    // check video ownership
    if(video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorizes to update this video")
    }

    // Prepare update fields
    const updateFields = {};

    if(title !== undefined) {
        updateFields.title = title;
    }

    if(description !== undefined) {
        updateFields.description = description;
    }

    // update thumbnail if provided

    const thumbnailLocalPath = req.file?.path;

    if(thumbnailLocalPath) {
        const thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath);
    
    if(!thumbnailFile?.url){
        throw new ApiError(500, "Thumbnail upload failed")
    }
    updateFields.thumbnail = thumbnailFile.url;
   }

   // check for update fields
   if(Object.keys(updateFields).length === 0) {
    throw new ApiError(400, "No video details provided to update");
   }

   // update video

   const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
                {
                    $set: updateFields
                },
                {
                    new: true,
                    runValidators: true
                }
);

return res.status(200).json(
        new ApiResponse(
            200,
            updatedVideo,
            "Video updated successfully"
        )
    );

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    // validate videoId
    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    // find video
    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "Video not found")
    }

     //check video ownership
     if(video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video");
     }

     // Delete video from database
     await Video.findByIdAndDelete(videoId);

     return res.status(200)
     .json(new ApiResponse(200, {}, "Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

     // validate videoId
    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    // find video
    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "Video not found")
    }

     //check video ownership
     if(video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video");
     }

     // Toggle publish status
     video.isPublished = !video.isPublished;

     await video.save({validateBeforeSave: false});

     return req.status(200)
     .json(new ApiResponse(200, video, `Video ${video.isPublished ? "published" : "unpublished"} successfully`))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}