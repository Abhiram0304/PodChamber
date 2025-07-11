import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../config/S3Client";

interface GeneratePresignedUrlInput {
  roomId: string;
  userName: string;
  chunkIndex: number;
  sessionId: string;
}

interface GeneratePresignedUrlResult {
  success: boolean;
  signedUrl?: string;
  finalUrl?: string;
  error?: string;
}

export async function s3Uploader({
  roomId,
  userName,
  chunkIndex,
  sessionId,
}: GeneratePresignedUrlInput): Promise<GeneratePresignedUrlResult> {
  try{
    const key = `video-recordings/${sessionId}/${userName}/chunk-${chunkIndex
                  .toString()
                  .padStart(4, "0")}.webm`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      ContentType: "video/webm",
      Metadata: {
        "session-id": sessionId,
        "chunk-number": chunkIndex.toString(),
        "timestamp": new Date().toISOString(),
        "room-id": roomId,
        "user-name": userName,
      },
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });

    return {
      success: true,
      signedUrl,
      finalUrl: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    };
  }catch(error){
    console.error("S3 pre-signed URL generation failed:", error);
    return{
      success: false,
      error: "Failed to generate pre-signed URL",
    };
  }
}