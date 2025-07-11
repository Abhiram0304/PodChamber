import path from "path";
import fs from "fs/promises";
import ffmpeg from "fluent-ffmpeg";

export const concatenateChunks = async (
  inputFiles: string[],
  outputFile: string
): Promise<string> => {
  const listFile = path.join(path.dirname(outputFile), "inputs.txt");
  const content = inputFiles.map(f => `file '${f}'`).join("\n");
  await fs.writeFile(listFile, content);

  console.log("HERE1233");

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listFile)
      .inputOptions(["-f", "concat", "-safe", "0"])
      .outputOptions(["-c", "copy"])
      .output(outputFile)
      .on("end", () => resolve(outputFile))       
      .on("error", (err) => reject(err)) 
      .run();
  });
};
