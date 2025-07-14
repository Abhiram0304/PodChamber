import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath!);

export const mergeVideosSideBySide = async (
  left: string,
  right: string,
  output: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(left)
      .input(right)
      .complexFilter([
        "[0:v]scale=-1:720[left]",
        "[1:v]scale=-1:720[right]",
        "[left]pad=iw+20:ih[leftpad]",
        "[leftpad][right]overlay=x=W-ow:y=0[outv]"
      ])
      .map("outv")
      .outputOptions(["-preset", "ultrafast"])
      .output(output)
      .on("end", () => resolve("DONE MERGING"))
      .on("error", (e) => reject(e))
      .run();
  });
};
