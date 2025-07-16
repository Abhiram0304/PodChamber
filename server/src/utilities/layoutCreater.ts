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
        "[0:v]scale=640:720[left]",
        "[1:v]scale=640:720[right]",
        "[left][right]hstack=inputs=2[outv]",
        "[0:a]aresample=async=1[a0]",
        "[1:a]aresample=async=1[a1]",
        "[a0][a1]amix=inputs=2:duration=first:dropout_transition=3[outa]"
      ])
      .outputOptions([
        "-map", "[outv]",
        "-map", "[outa]",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-preset", "ultrafast",
        "-shortest"
      ])
      .output(output)
      .on("end", () => resolve("DONE MERGING"))
      .on("error", (e) => reject(e))
      .run();
  });
};
