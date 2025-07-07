import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
  keyPrefix?: string;
}

export class S3Uploader {
  private s3Client: S3Client;
  private bucketName: string;
  private keyPrefix: string;
  private sessionId: string;
  private chunkCount: number = 0;

  constructor(keyPrefix?: string) {
    const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
    const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
    const region = import.meta.env.VITE_AWS_REGION;
    const bucketName = import.meta.env.VITE_S3_BUCKET_NAME;

    if(!accessKeyId || !secretAccessKey || !bucketName || !region){
      throw new Error('Missing required AWS environment variables. Please check your .env file.');
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.bucketName = bucketName;
    this.keyPrefix = keyPrefix || 'video-recordings/';
    this.sessionId = Date.now().toString();
  }

  async uploadChunk(blob: Blob, roomId: string, userName: string): Promise<string> {
    console.log("Uploading chunk");
    const chunkId = `chunk-${this.chunkCount.toString().padStart(4, '0')}`;
    this.chunkCount++;

    const key = `${this.keyPrefix}${roomId}/${userName}/${this.sessionId}/${chunkId}.webm`;

    try{
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: blob, 
          ContentType: 'video/webm',
          Metadata: {
            'session-id': this.sessionId,
            'chunk-number': this.chunkCount.toString(),
            'timestamp': new Date().toISOString(),
            'room-id': roomId,
            'user-name': userName,
          },
        },
        queueSize: 1, 
        partSize: 5 * 1024 * 1024, 
        leavePartsOnError: false,
      });

      upload.on('httpUploadProgress', (progress) => {
        const loaded = progress.loaded ?? 0;
        const total = progress.total ?? 0;

        const percent = total > 0 ? ((loaded / total) * 100).toFixed(2) : '0';
        console.log(`Uploading ${key} → ${percent}%`);
      });

      await upload.done();
      const location = `https://${this.bucketName}.s3.${this.s3Client.config.region}.amazonaws.com/${key}`;
      console.log(`Chunk ${chunkId} uploaded successfully:`, location);
      return location;
    }catch(error){
      console.error(`Failed to upload chunk ${chunkId}:`, error);
      throw error;
    }
  }

  getSessionInfo(): { sessionId: string; chunkCount: number; bucketName: string; keyPrefix: string } {
    return {
      sessionId: this.sessionId,
      chunkCount: this.chunkCount,
      bucketName: this.bucketName,
      keyPrefix: this.keyPrefix,
    };
  }

  destroy(): void {
    this.s3Client.destroy();
  }
}
