import express from "express";
import { getCompleteLayoutVideo, getVideoChunksFromSessionId, deleteOldVideoCronJob } from "../controllers/videoController";
const router = express.Router();

router.post("/getVideoChunksFromSessionId", getVideoChunksFromSessionId);
router.post('/getCompleteLayoutVideo', getCompleteLayoutVideo)
router.post('/deleteOldVideoCronJob', deleteOldVideoCronJob)
export default router;
