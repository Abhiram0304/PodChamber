export default function createMediaRecorder(
  stream: MediaStream,
  onChunk: (blob: Blob) => void,
  chunkInterval = 10000 // 10 sec
){
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus',});

  recorder.ondataavailable = (event) => {
    if(event.data && event.data.size > 0){
      onChunk(event.data);
    }
  };

  const start = () => {
    recorder.start(chunkInterval);
    console.log('Recording started');
  };

  const stop = () => {
    recorder.stop();
    console.log('Recording stopped');
  };

  return { start, stop };
}
