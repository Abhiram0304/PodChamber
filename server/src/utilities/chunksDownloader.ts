import axios from "axios";
import fs from "fs/promises";
import path from "path";

export const downloadChunksToLocal = async (sessionId: string, urls: string[]): Promise<string[]> => {
    const folder = path.join(process.cwd(), "chunksStorage", sessionId);
    await fs.mkdir(folder, { recursive: true });

    const localPaths: string[] = [];

    for(let i = 0; i < urls.length; i++){
        const res = await axios.get(urls[i], { responseType: "arraybuffer" });
        const localPath = path.join(folder, `chunk-${i.toString().padStart(4, "0")}.webm`);
        await fs.writeFile(localPath, res.data);
        localPaths.push(localPath);
    }

    return localPaths;
}
