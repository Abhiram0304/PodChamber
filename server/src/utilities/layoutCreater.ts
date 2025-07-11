import ffmpeg from "fluent-ffmpeg";

export const mergeVideosSideBySide = async(left: string, right: string, output: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(left)
      .input(right)
      .complexFilter(["[0:v][1:v]hstack=inputs=2[outv]"])
      .map("outv")
      .outputOptions(["-preset", "ultrafast"])
      .output(output)
      .on("end", () => resolve)
      .on("error", (e) => reject(e))
      .run();
  });
}
