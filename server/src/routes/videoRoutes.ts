import express from "express";
import { getCompleteLayoutVideo, getVideoChunksFromSessionId } from "../controllers/videoController";
const router = express.Router();

router.post("/getVideoChunksFromSessionId", getVideoChunksFromSessionId);
router.post('/getCompleteLayoutVideo',getCompleteLayoutVideo)
export default router;
