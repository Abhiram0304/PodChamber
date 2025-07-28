import { Socket } from "socket.io-client";

export class S3PresignedUploader {
  private socket: Socket;
  private chunkCount: number = 0;
  private sessionId: string = "";

  constructor(socket: Socket) {
    this.socket = socket;
  }

  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
  }

  async uploadChunk(blob: Blob, roomId: string, userName: string): Promise<string> {
    const chunkIndex = this.chunkCount++;

    if(!this.sessionId){
      throw new Error("Session ID not set in S3PresignedUploader");
    }

    return new Promise((resolve, reject) => {
      this.socket.emit(
        "get-presigned-url",
        { roomId, userName, chunkIndex, sessionId: this.sessionId },
        async (response: {
          success: boolean;
          signedUrl?: string;
          finalUrl?: string;
          error?: string;
        }) => {
          if(!response.success || !response.signedUrl || !response.finalUrl){
            console.error("Failed to get presigned URL", response.error);
            return reject(response.error);
          }

          try{
            const res = await fetch(response.signedUrl, { method: "PUT", headers: {   "Content-Type": "video/webm", }, body: blob,});

            if(!res.ok){
              throw new Error(`Upload failed with status ${res.status}`);
            }

            resolve(response.finalUrl);
          }catch(err){
            console.error("Upload failed:", err);
            reject(err);
          }
        }
      );
    });
  }
}
