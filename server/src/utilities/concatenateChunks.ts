import path from "path";
import fs from "fs/promises";
import fssync from "fs";
import os from "os";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { v4 as uuid } from "uuid";

ffmpeg.setFfmpegPath(ffmpegPath as string);

export const concatenateChunks = async (
  inputFiles: string[],
  outputFile: string
): Promise<void> => {
  const tempDir = path.join(os.tmpdir(), `concat-${uuid()}`);
  await fs.mkdir(tempDir, { recursive: true });

  const mergedRawPath = path.join(tempDir, "merged-raw.webm");

  try{
    const writeStream = fssync.createWriteStream(mergedRawPath);
    for(const filePath of inputFiles){
      await new Promise((resolve, reject) => {
        const read = fssync.createReadStream(filePath);
        read.pipe(writeStream, { end: false });
        read.on("end", () => resolve(console.log("DONE")));
        read.on("error", reject);
      });
    }
    writeStream.end();

    await new Promise<void>((resolve, reject) => {
      ffmpeg(mergedRawPath)
        .outputOptions([
          "-c:v", "libvpx",
          "-b:v", "1M",
          "-crf", "10",
          "-c:a", "libopus" 
        ])
        .output(outputFile)
        .on("start", cmd => console.log("FFmpeg started:", cmd))
        .on("stderr", line => console.log("FFmpeg stderr:", line))
        .on("end", () => {
          resolve();
        })
        .on("error", (err) => {
          console.error("FFmpeg error:", err.message);
          reject(err);
        })
        .run();
    });
  }catch(err){
    throw err;
  }finally{
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};
