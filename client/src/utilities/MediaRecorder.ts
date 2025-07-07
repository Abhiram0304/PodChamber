import { S3Uploader } from './S3uploader';

export interface RecorderConfig {
  s3Uploader?: S3Uploader | null;
  roomId?: string;
  userName?: string;
  enableLocalDownload?: boolean;
}

export default function createMediaRecorder(
  stream: MediaStream,
  onChunk: (blob: Blob) => void,
  chunkInterval = 1000, // 1 sec
  config?: RecorderConfig
) {
  const recorder = new MediaRecorder(stream, { 
    mimeType: 'video/webm;codecs=vp9,opus',
  });

  recorder.ondataavailable = async (event) => {
    if(event.data && event.data.size > 0){
      onChunk(event.data);

      if(config?.s3Uploader && config?.roomId && config?.userName){
        try{
          await config.s3Uploader.uploadChunk(
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