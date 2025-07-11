import { S3PresignedUploader } from './S3uploader';

export interface RecorderConfig {
  S3PresignedUploader?: S3PresignedUploader | null;
  roomId?: string;
  userName?: string;
  enableLocalDownload?: boolean;
}

export default function createMediaRecorder(
  stream: MediaStream,
  onChunk: (blob: Blob) => void,
  chunkInterval = 10000, // 1 sec
  config?: RecorderConfig
) {
  const recorder = new MediaRecorder(stream, { 
    mimeType: 'video/webm;codecs=vp9,opus',
  });

  recorder.ondataavailable = async (event) => {
    if(event.data && event.data.size > 0){
      onChunk(event.data);

      if(config?.S3PresignedUploader && config?.roomId && config?.userName){
        try{
          await config.S3PresignedUploader.uploadChunk(
            event.data, 
            config.roomId, 
            config.userName
          );
        }catch(error){
          console.error('S3 upload failed:', error);
          // if (config.enableLocalDownload) {
          //   downloadChunkLocally(event.data);
          // }
        }
      }
    }
  };

  const start = () => {
    console.log('Recording started HERE');
    recorder.start(chunkInterval);
  };

  const stop = () => {
    recorder.stop();
    console.log('Recording stopped HERE');
  };

  return { start, stop };
}