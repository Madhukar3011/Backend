import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import { ApiResponse } from "../utils/apiResponse.js" 
import {asyncHandler} from "../utils/asyncHandler.js"
import {User} from "../controllers/user.controller"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    //TODO: create playlist
    if(!name || !name.trim()) {
        throw new ApiError(400, "Playlist name is required");
    }

    // create playlist 
    const playlist  = await Playlist.create({
        name: name.trim(),
        description: description?.trim() || "",
        owner: req.user._id
    });

    if(!playlist) {
        throw new ApiError(500, "Failed to create playlist")
    }

     return res.status(200).json(
        new ApiResponse(
            200,
            playlist,
            "Playlist created successfully"
        )
    );

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user Id");
    }

    const user = await User.findById(userId);
    if(!user) {
        throw new ApiError(404, "User not found");
    }

    const {page = 1, limit = 10} = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.max(1, parseInt(page, 10) || 10);
    const skip = (pageNumber - 1) * limitNumber;

    // get user playlists
    const playlists = await Playlist.find({owner: userId})
    .populate("owner", "username fullName avatar")
    .sort({createdAt: -1})
    .skip(skip)
    .limit(limitNumber);

    const totalPlaylists = await Playlist.countDocuments({
        owner: userId
    });

    return res.status(200).json(
        new ApiResponse(200,
            {
                playlists,
                pagination: {
                    totalPlaylists,
                    currentPage: pageNumber,
                    totalPages: Math.ceil(totalPlaylists / limitNumber),
                    limit: limitNumber
                }
            },
            "User playlists fetched successfully"
        )
    )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id

    if(!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id");
    }

    const playlist = await Playlist.findById(playlistId)
    .populate("owner" , "username fullName avatar")
    .populate({
        path: "videos",
        populate: {
            path: "owner",
            select: "username fullName avatar"
        }
    });

    if(!playlist) {
        throw new ApiError(404, 'Playlist  not found ')
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            playlist,
            "Playlist fetched successfully"
        )
    );
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params;

    if(!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id");
    };

    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    if(playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to modify this playlist")
    };

    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    // Prevent duplicate video in playlist 
    if(playlist.videos.some((id) => id.toString() === video))  {
        throw new ApiError(409, "Video already exists in this playlist");
    }

    // add video to playlist 
    playlist.videos.push(videoId); 
    await playlist.save();

    return res.status(200).json(
        new ApiResponse(200,
            playlist,
            "Video added to playlist successfully"
        )
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

    if(!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id");
    }

    if(!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id");
    }

    const playlist = await Playlist.findById(playlistId) ;
     if(!playlist) {
        throw new ApiError(404, "Playlist not found");
     }

     if(playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403,
            "You are not allowed to modify this playlist"
        )
     }
    
     // check whether video exists in the playlist 
     const videoIndex = playlist.videos.findIndex(
        (id) => id.toString() === videoId
     );

     if(videoIndex === -1) {
        throw new ApiError(404, "Video not found in this playlist");
     }

     // Remove video from Playlist 
     playlist.videos.splice(videoIndex, 1);

     await playlist.save();

      return res.status(200).json(
        new ApiResponse(
            200,
            playlist,
            "Video removed from playlist successfully"
        )
    );

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist

    if(!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id");
    }

    const playlist  = await Playlist.findById(playlistId);

    if(!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if(playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 
            "You are not allowed to delete this playlist "
        );
    }

    // Delete playlist 
    await Playlist.findByIdAndDelete(playlistId);

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Playlist deleted successfully"
        )
    );
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if(!mongoose.isValidObjectId(PlaylistId)) {
        throw new ApiError(400, "Invalid playlist Id");
    }

    // Check that al least one field is provided

    if(name === undefined && description === undefined) {
        throw new ApiError(400, "At least one field is required to update");
    }

    const playlist  = await Playlist.findById(playlistId);

    if(!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if(playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(
            403,
            "You are not allowed to update this playlist"
        );
    }

    // validate and update name if provide 
    if(name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
            throw new ApiError(400, "Playlist name cannot bo empty")
        } 
        playlist.name = name.trim();
    }

    // validate and update description if provided
    if(description != undefined) {
        if(typeof description !== "string") {
            throw new ApiError(400, "Description must be a string");
        }
        playlist.description = description.trim();
    }

    // save update playlist 
    await playlist.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            playlist,
            "Playlist updated successfully"
        )
    );

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}