import { useSelector } from "react-redux";
import type { RootState } from "../reducers";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import createMediaRecorder from "../utilities/MediaRecorder";
import type { RecorderType } from "../types";
import { BsMic, BsMicMute, BsCameraVideo, BsCameraVideoOff } from 'react-icons/bs';
import { S3PresignedUploader } from "../utilities/S3uploader";
import { SERVER_URL } from "../services/APIs";
const Room = () => {

    const userName = useSelector((state: RootState) => state.app.userName)
    const roomId = useSelector((state: RootState) => state.app.roomId)

    const [remoteUserName, _setRemoteUserName] = useState<string | null>(null);
    const [lobby, setLobby] = useState<boolean>(true)
    const [socket, setSocket] = useState<Socket | null>(null)
    const [_senderPc, setSenderPc] = useState<null | RTCPeerConnection>(null)    
    const [_receiverPc, setReceiverPc] = useState<null | RTCPeerConnection>(null)
    const [recordingOn, setRecordingOn] = useState<boolean>(false);
    const localVideoTrackRef = useRef<MediaStreamTrack | null>(null);
    const localAudioTrackRef = useRef<MediaStreamTrack | null>(null);
    // const [remoteVideoTrack, setRemoteVideoTrack] = useState<null | MediaStreamTrack>(null) 
    // const [remoteAudioTrack, setRemoteAudioTrack] = useState<null | MediaStreamTrack>(null) 
    // const [remoteMediaStream, setRemoteMediaStream] = useState<null | MediaStream>(null)    
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
    const localVideoRef = useRef<HTMLVideoElement | null>(null)
    const [audioMuted, setAudioMuted] = useState<boolean>(false);
    const [videoMuted, setVideoMuted] = useState<boolean>(false);
    const s3PresignedUploaderRef = useRef<S3PresignedUploader | null>(null);
    const recorderRef = useRef<RecorderType | null>(null);
    const [recordingStatusText, setRecordingStatusText] = useState<string>("Start Recording");


    useEffect(() => {
        if(localVideoTrackRef.current){
            localVideoTrackRef.current.enabled = !videoMuted;
        }
        if(localAudioTrackRef.current){
            localAudioTrackRef.current.enabled = !audioMuted;
        }
    }, [audioMuted, videoMuted]);

    const getMedia = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        localAudioTrackRef.current = audioTrack;
        localVideoTrackRef.current = videoTrack;

        const recorder = createMediaRecorder(
            stream, 
            async (blob) => {
                console.log(`Chunk received: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
                
                if(!s3PresignedUploaderRef.current){
                    console.log("LOCAL DOWNLOAD", s3PresignedUploaderRef.current);
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const fileName = `recording-chunk-${timestamp}.webm`;
                    console.log("FILENAME", fileName);

                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 100);
                }
            },
            5000, // 5 seconds -> each chunk time
            {
                S3PresignedUploader: s3PresignedUploaderRef.current,
                roomId: roomId,
                userName: userName,
                enableLocalDownload: !s3PresignedUploaderRef.current
            }
        );
        recorderRef.current = recorder;

        if(!localVideoRef.current) return;

        localVideoRef.current.srcObject = new MediaStream([videoTrack]);
        localVideoRef.current.play();
    }

    useEffect(() => {
        const socket: Socket = io(SERVER_URL);

        socket.emit("join-room", {roomId, userName});
        
        socket.on("send-offer", async({roomId} : {roomId : string}) => {
            setLobby(false);
            const pc = new RTCPeerConnection();

            const stream = new MediaStream();
            if(localVideoTrackRef.current){
                stream.addTrack(localVideoTrackRef.current);
            }
            if(localAudioTrackRef.current){
                stream.addTrack(localAudioTrackRef.current);
            }

            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });

            pc.ontrack = (event) => {
                const [remoteStream] = event.streams;
                if(remoteVideoRef.current && remoteStream){
                    remoteVideoRef.current.srcObject = remoteStream;
                    remoteVideoRef.current.play().catch(console.error);
                }
            };

            pc.onicecandidate = (event) => {
                if(event.candidate){
                    socket.emit("add-ice-candidate", {
                        candidate: event.candidate,
                        roomId: roomId,
                        type: "sender",
                    })
                }
            }

            pc.onnegotiationneeded = async() => {
                const sdp = await pc.createOffer();
                await pc.setLocalDescription(sdp);
                socket.emit("offer", {sdp, roomId});
            }

            setSenderPc(pc);
        })

        socket.on("offer", async({remoteSdp, roomId} : {remoteSdp: RTCSessionDescriptionInit, roomId: string}) => {
            setLobby(false);
            const pc = new RTCPeerConnection();
            
            pc.ontrack = (event) => {
                const [remoteStream] = event.streams;
                if(remoteVideoRef.current && remoteStream){
                    remoteVideoRef.current.srcObject = remoteStream;
                    remoteVideoRef.current.play().catch(console.error);
                }
            };

            const stream = new MediaStream();
            if(localVideoTrackRef.current){
                stream.addTrack(localVideoTrackRef.current);
            }
            if(localAudioTrackRef.current){
                stream.addTrack(localAudioTrackRef.current);
            }

            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });

            await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp));
            const sdp = await pc.createAnswer();
            await pc.setLocalDescription(sdp);

            pc.onicecandidate = (event) => {
                if(!event.candidate) return;

                socket.emit("add-ice-candidate", {
                    candidate: event.candidate,
                    roomId: roomId,
                    type: "receiver",
                })
            }

            setReceiverPc(pc);

            socket.emit("answer", {
                sdp,
                roomId,
            })
        })

        socket.on("answer", ({remoteSdp} : {roomId: string, remoteSdp: RTCSessionDescriptionInit}) => {
            setLobby(false);
            setSenderPc(pc => {
                if(pc){
                    pc.setRemoteDescription(remoteSdp);
                }
                return pc;
            });
        })

        socket.on("lobby", () => {
            setLobby(true);
        })

        socket.on("add-ice-candidate", ({ candidate, type}) => {
            if(type === "sender"){
                setReceiverPc(pc => {
                    if(pc){
                        pc.addIceCandidate(candidate).catch(console.error);
                    }
                    return pc; 
                })
            }else{
                setSenderPc(pc => {
                    if(pc){
                        pc.addIceCandidate(candidate).catch(console.error);
                    }
                    return pc;
                })
            }
        });

        socket.on("start-recording-at",({startTime, sessionId}: {startTime: number, sessionId: string}) => {
            const delay = startTime - Date.now();
            console.log("Session ID:", sessionId);

            if(s3PresignedUploaderRef.current){
                s3PresignedUploaderRef.current.setSessionId(sessionId);
            }

            if(delay > 0){
                console.log("Start the Recording After Delay:",delay);
                setRecordingStatusText("Starting Recording...");
                setTimeout(() => {
                    console.log("SHOULD START NOW");
                    recorderRef.current?.start();
                    setRecordingStatusText("Recording..."); 
                    setRecordingOn(true);
                }, delay)
            }else{
                console.log("Recording Start time passed, start now");
                recorderRef.current?.start();
                setRecordingStatusText("Recording..."); 
                setRecordingOn(true);
            }
        })

        socket.on("stop-recording", () => {
            recorderRef.current?.stop();
            setRecordingOn(false);
            setRecordingStatusText("Start Recording"); 
        });

        socket.on("recording-error", ({ message }: { message: string }) => {
            console.warn("Recording error:", message);
            setRecordingStatusText("Start Recording"); 
            alert(message);
        });

        setSocket(socket);
        
        return () => {
            socket.disconnect();
            if(recordingOn){
                socket.emit("stop-recording");
                recorderRef.current?.stop();
                setRecordingStatusText("Start Recording"); 
                setRecordingOn(false);
            }
        };
        
    }, [userName, roomId]);

    const recordingHandler = () => {

        if(!socket) return;

        if(recordingOn){
            setRecordingStatusText("Stopping Recording...");
            socket.emit("stop-recording", {roomId});
        }else{
            setRecordingStatusText("Starting Recording...");
            const startTime = Date.now() + 5000;
            socket.emit("prepare-for-recording", {roomId, startTime});
        }
    }

    useEffect(() => {
        try{
            if(!socket) return; 
            const uploader = new S3PresignedUploader(socket);
            s3PresignedUploaderRef.current = uploader;
            console.log("S3 pre-signed uploader initialized");
            getMedia();
        }catch(error){
            console.error('Failed to initialize S3 uploader:', error);
        }
    }, [socket]);


    return (
        <div className="relative w-[100vw] min-h-[calc(100vh-4rem)] bg-black text-white flex flex-col items-center gap-[2rem]">
            <div className="w-full flex justify-between items-center text-md font-medium p-[1rem]">
                <p>👋 Hello, <span className="font-semibold text-blue-400">{userName}</span></p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <button
                        onClick={recordingHandler}
                        className={`px-6 py-2 cursor-pointer rounded-xl font-semibold transition duration-300 ${
                            recordingOn
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                    >
                        {recordingStatusText}
                    </button>
                </div>
                {/* <div className="text-sm text-gray-400">
                    S3 Upload: {s3UploaderRef.current ? "Ready" : "Not configured"}
                </div> */}
                <p>🛋 Room: <span className="font-semibold text-green-400">{roomId}</span></p>
            </div>

            

            <div className="flex gap-4 sm:w-[60%] w-[90%] sm:flex-row flex-col items-center justify-center">
                <div className="w-full flex flex-col items-center">
                    <p>{userName} (You)</p>
                    <video autoPlay muted className="border-amber-50 w-full border-2 rounded-[1rem]" ref={localVideoRef} />
                </div>
                
                <div className="w-full sm:h-full h-[300px] flex flex-col">
                    <p>{remoteUserName!==null ? remoteUserName : ""}</p>
                    {lobby ? (
                        <div className="w-full min-h-[200px] sm:h-full h-[300px] border-amber-50 border-2 flex rounded-[1rem] items-center justify-center">
                            <p>Waiting to connect you to someone</p>
                        </div>
                    ) : (
                        <video autoPlay className="border-amber-50 w-full border-2 rounded-[1rem]" ref={remoteVideoRef} />
                    )}
                </div>
            </div>

            <div className="flex items-center justify-center gap-4 py-[0.5rem] px-[1rem] rounded-[2rem] bg-gray-900">
                <button
                    onClick={() => setAudioMuted(!audioMuted)}
                    className={`
                        relative cursor-pointer w-14 h-14 rounded-full flex items-center justify-center
                        transition-all duration-200 ease-in-out transform hover:scale-105
                        ${audioMuted 
                            ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30' 
                            : 'bg-gray-700 hover:bg-gray-600 shadow-lg shadow-gray-700/30'
                        }
                    `}
                    title={audioMuted ? 'Unmute' : 'Mute'}
                >
                    {audioMuted ? (
                            <BsMicMute className="w-6 h-6 text-white" />
                        ) : (
                            <BsMic className="w-6 h-6 text-white" />
                    )}
                
                    {audioMuted && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-900"></div>
                    )}
                </button>

                <button
                    onClick={() => setVideoMuted(!videoMuted)}
                    className={`
                        relative cursor-pointer w-14 h-14 rounded-full flex items-center justify-center
                        transition-all duration-200 ease-in-out transform hover:scale-105
                        ${videoMuted 
                            ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30' 
                            : 'bg-gray-700 hover:bg-gray-600 shadow-lg shadow-gray-700/30'
                        }
                    `}
                    title={videoMuted ? 'Turn on camera' : 'Turn off camera'}
                >
                    {videoMuted ? (
                            <BsCameraVideoOff className="w-6 h-6 text-white" />
                        ) : (
                            <BsCameraVideo className="w-6 h-6 text-white" />
                    )}
                    
                    {videoMuted && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-900"></div>
                    )}
                </button>
            </div>

            <div className="absolute bottom-[1rem] w-full text-center text-white font-semibold">Made by Abhiram T</div>
        </div>
    )
}

export default Room