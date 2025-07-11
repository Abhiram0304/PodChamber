import path from "path";
import fs from "fs/promises";
import ffmpeg from "fluent-ffmpeg";

export const concatenateChunks = async (
  inputFiles: string[],
  outputFile: string
): Promise<void> => {
  const listFile = path.join(path.dirname(outputFile), "inputs.txt");
  const content = inputFiles.map(f => `file '${f}'`).join("\n");
  await fs.writeFile(listFile, content);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listFile)
      .inputOptions(["-f", "concat", "-safe", "0"])
      .outputOptions(["-c", "copy"])
      .output(outputFile)
      .on("end", () => resolve())       
      .on("error", (err) => reject(err)) 
      .run();
  });
};
