import axios from "axios";
import fs from "fs/promises";
import path from "path";

export const downloadChunksToLocal = async (sessionId: string, userName: string, urls: string[]): Promise<string[]> => {
    const folder = path.join(process.cwd(), "chunksStorage", sessionId, userName);
    await fs.mkdir(folder, { recursive: true });

    const localPaths: string[] = [];

    for(let i = 0; i < urls.length; i++){
        const res = await axios.get<ArrayBuffer>(urls[i], { responseType: "arraybuffer" });
        const localPath = path.join(folder, `chunk-${i.toString().padStart(4, "0")}.webm`);
        await fs.writeFile(localPath, Buffer.from(res.data));        
        localPaths.push(localPath);
    }

    return localPaths;
}
