import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "fs/promises";
import { s3Client } from "../config/S3Client";

export const s3MergeUploader = async(filePath: string, key: string): Promise<string> => {
  const fileBuffer = await fs.readFile(filePath);
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    Body: fileBuffer,
    ContentType: "video/mp4",
  });

  console.log("UPLOADING");

  await s3Client.send(command);
  console.log("AFTER UPLOADING");
  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
