import { Request, Response } from "express";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";
import { tmpdir } from "os";
import { v4 as uuidv4 } from "uuid";
import { downloadChunksToLocal } from "../utilities/chunksDownloader";
import { concatenateChunks } from "../utilities/concatenateChunks";
import { mergeVideosSideBySide } from "../utilities/layoutCreater";
import { s3MergeUploader } from "../utilities/s3MergeUploader";
import preRenderVideoLinkTemplate from "../mailTemplates/preRenderVideoLink";
import preRenderVideoFailureTemplate from "../mailTemplates/preRenderVideoFailureTemplate";

const s3 = new S3Client({ region: process.env.AWS_REGION });

export const getVideoChunksFromSessionId = async (req: Request, res: Response) => {
  try{
    const { sessionId } = req.body;

    if(!sessionId){
      res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
      return;
    }

    const prefix = `video-recordings/${sessionId}/`;
    const command = new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET_NAME!, Prefix: prefix });

    const result = await s3.send(command);

    if(!result.Contents || result.Contents.length === 0){
      res.status(402).json({
        success: false,
        message: "No video chunks found for this session",
      });
      return;
    }

    const users: Record<string, string[]> = {};

    for(const obj of result.Contents){
      const key = obj.Key!;
      const parts = key.split("/");

      if(parts.length < 4) continue;
      const user = parts[2];
      const url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      if(!users[user]) users[user] = [];
      users[user].push(url);
    }

    for(const user in users) users[user].sort(); 

    res.status(200).json({
      success: true,
      users,
    });
  }catch(e){
    console.error("S3 error:", e);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const getCompleteLayoutVideo = async (req: Request, res: Response) => {
  try {
    const { sessionId, emailId } = req.body;

    if(!sessionId || !emailId){
      res.status(400).json({
        success: false,
        message: "Data is required",
      });
      return;
    }

    const prefix = `video-recordings/${sessionId}/`;
    const command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME!,
      Prefix: prefix,
    });

    const result = await s3.send(command);

    if(!result.Contents || result.Contents.length === 0){
      res.status(404).json({
        success: false,
        message: "No video chunks found for this session",
      });
      return;
    }

    const users: Record<string, string[]> = {};

    for(const obj of result.Contents){
      const key = obj.Key!;
      const parts = key.split("/");

      if(parts.length < 4) continue;

      const user = parts[2];
      const url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      if(!users[user]) users[user] = [];
      users[user].push(url);
    }

    const userIds = Object.keys(users);
    if(userIds.length !== 2){
      res.status(400).json({
        success: false,
        message: "Exactly 2 users are required in a session to merge layout.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "You will receive the video link via email shortly.",
    });

    setImmediate(async () => {
      try {
        for (const user in users) users[user].sort();

        const tempFolder = path.join(tmpdir(), uuidv4());
        await fs.mkdir(tempFolder, { recursive: true });

        const [user1, user2] = userIds;
        const [chunks1, chunks2] = [users[user1], users[user2]];

        const [local1, local2] = await Promise.all([
          downloadChunksToLocal(sessionId, chunks1),
          downloadChunksToLocal(sessionId, chunks2),
        ]);

        const video1 = path.join(tempFolder, `${user1}-merged.webm`);
        const video2 = path.join(tempFolder, `${user2}-merged.webm`);
        const finalOutput = path.join(tempFolder, `final-output.mp4`);

        await Promise.all([
          concatenateChunks(local1, video1),
          concatenateChunks(local2, video2),
        ]);

        await mergeVideosSideBySide(video1, video2, finalOutput);

        const s3Key = `merged-videos/session-${Date.now()}.mp4`;
        const finalUrl = await s3MergeUploader(finalOutput, s3Key);

        const htmlBody = preRenderVideoLinkTemplate(finalUrl);
        await SendEmail({
          email: emailId,
          title: "Your PodChamber Pre-Rendered Video is Ready",
          body: htmlBody,
        });

      }catch(err){
        console.error("Background video processing failed:", err);
        await SendEmail({
          email: emailId,
          title: "PodChamber Video Rendering Failed",
          body: preRenderVideoFailureTemplate(),
        });
      }
    });

  }catch(e){
    console.error("Top-level error:", e);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};
