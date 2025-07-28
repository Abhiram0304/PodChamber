import { useSelector } from "react-redux";
import type { RootState } from "../reducers";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import createMediaRecorder from "../utilities/MediaRecorder";
import type { RecorderType } from "../types";
import { BsMic, BsMicMute, BsCameraVideo, BsCameraVideoOff, BsTelephoneX } from 'react-icons/bs';
import { S3PresignedUploader } from "../utilities/S3uploader";
import { SERVER_URL } from "../services/APIs";
import toast from "react-hot-toast";
import { FiCopy } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:global.stun.twilio.com:3478" },
    { urls: "stun:stun.stunprotocol.org:3478" },
    { urls: "stun:stun.sipgate.net:3478" },
    { urls: "stun:stun.ekiga.net" },
  ]
};

const Room = () => {

    const userName = useSelector((state: RootState) => state.app.userName)
    const roomId = useSelector((state: RootState) => state.app.roomId)

    const [remoteUserName, setRemoteUserName] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null)
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const iceCandidatesBufferRef = useRef<RTCIceCandidateInit[]>([]);
    const [recordingOn, setRecordingOn] = useState<boolean>(false);
    const localVideoTrackRef = useRef<MediaStreamTrack | null>(null);
    const localAudioTrackRef = useRef<MediaStreamTrack | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
    const localVideoRef = useRef<HTMLVideoElement | null>(null)
    const [audioMuted, setAudioMuted] = useState<boolean>(false);
    const [videoMuted, setVideoMuted] = useState<boolean>(false);
    const s3PresignedUploaderRef = useRef<S3PresignedUploader | null>(null);
    const recorderRef = useRef<RecorderType | null>(null);
    const [recordingStatusText, setRecordingStatusText] = useState<string>("Start Recording");
    const [mediaReady, setMediaReady] = useState<boolean>(false);
    const [localMediaStream, setLocalMediaStream] = useState<MediaStream | null>(null);
    const remoteMediaStreamRef = useRef<MediaStream | null>(new MediaStream());
  
    const navigate = useNavigate();

    useEffect(() => {
        if(localVideoTrackRef.current){
            localVideoTrackRef.current.enabled = !videoMuted;
        }
        if(localAudioTrackRef.current){
            localAudioTrackRef.current.enabled = !audioMuted;
        }
    }, [audioMuted, videoMuted]);

    const handleRemoteTrack = (event: RTCTrackEvent) => {
        if(!remoteVideoRef.current) return;

        if(!remoteMediaStreamRef.current) {
            remoteMediaStreamRef.current = new MediaStream();
        }

        const stream = remoteMediaStreamRef.current;
        stream.addTrack(event.track);

        if(!remoteVideoRef.current.srcObject){
            remoteVideoRef.current.srcObject = stream;
        }


        remoteVideoRef.current.play()
    };

    const getMedia = async () => {
            const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];
            localAudioTrackRef.current = audioTrack;
            localVideoTrackRef.current = videoTrack;

            setLocalMediaStream(stream);

            if(!localVideoRef.current) return;

            localVideoRef.current.srcObject = new MediaStream([videoTrack]);
            localVideoRef.current.play();

            setMediaReady(true);
    }

    useEffect(() => {
        getMedia();
    }, []);

    const initialiseS3presignedUploader = async() => {
        if(!localMediaStream || !socket) return;
        const uploader = new S3PresignedUploader(socket);
        s3PresignedUploaderRef.current = uploader;

        const recorder = createMediaRecorder(
                localMediaStream, 
                async (blob) => {
                    console.log(`Chunk received: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
                    if(!s3PresignedUploaderRef.current){
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const fileName = `recording-chunk-${timestamp}.webm`;
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName;
                        a.click();
                        setTimeout(() => URL.revokeObjectURL(url), 100);
                    }
                },
                5000,
                {
                    S3PresignedUploader: s3PresignedUploaderRef.current,
                    roomId: roomId,
                    userName: userName,
                    enableLocalDownload: !s3PresignedUploaderRef.current
                }
            );
        recorderRef.current = recorder;
    }

    useEffect(() => {
        initialiseS3presignedUploader();
    }, [mediaReady, socket]);
    

    useEffect(() => {
        if(!mediaReady) return;
        const socket: Socket = io(SERVER_URL);
        setSocket(socket);

        socket.emit("join-room", {roomId, userName});

        socket.on("send-offer", async ({ roomId }: { roomId: string }) => {
            const pc = new RTCPeerConnection(rtcConfig);
            peerConnectionRef.current = pc;

            if (localMediaStream) {
                localMediaStream.getTracks().forEach(track => pc.addTrack(track, localMediaStream));
            }

            pc.ontrack = handleRemoteTrack;
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("add-ice-candidate", { candidate: event.candidate, roomId });
                }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", { sdp: offer, roomId });
        });

        socket.on("offer", async ({ remoteSdp, roomId }: { remoteSdp: RTCSessionDescriptionInit, roomId: string }) => {
            const pc = new RTCPeerConnection(rtcConfig);
            peerConnectionRef.current = pc;

            if (localMediaStream) {
                localMediaStream.getTracks().forEach(track => pc.addTrack(track, localMediaStream));
            }

            pc.ontrack = handleRemoteTrack;
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("add-ice-candidate", { candidate: event.candidate, roomId });
                }
            };
            
            await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp));

            iceCandidatesBufferRef.current.forEach(candidate => pc.addIceCandidate(candidate));
            iceCandidatesBufferRef.current = [];

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("answer", { sdp: answer, roomId });
        });

        socket.on("answer", async ({ remoteSdp }: { remoteSdp: RTCSessionDescriptionInit }) => {
            const pc = peerConnectionRef.current;
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp));
                iceCandidatesBufferRef.current.forEach(candidate => pc.addIceCandidate(candidate));
                iceCandidatesBufferRef.current = [];
            }
        });

        socket.on("add-ice-candidate", ({ candidate }: { candidate: RTCIceCandidateInit }) => {
            const pc = peerConnectionRef.current;
            if (pc?.remoteDescription) {
                pc.addIceCandidate(candidate);
            } else {
                iceCandidatesBufferRef.current.push(candidate);
            }
        });

        socket.on("confirm-end-call", () => {
            setRemoteUserName(null);
            setSessionId(null);
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
            }
            socket.disconnect();
            navigate("/");
            toast.success("Call ended successfully");
        });

        socket.on("start-recording-at",({startTime, sessionId}: {startTime: number, sessionId: string}) => {
            const delay = startTime - Date.now();
            setSessionId(sessionId);
            toast("Copy the SessionId shown, to later access your recording");

            if(s3PresignedUploaderRef.current){
                s3PresignedUploaderRef.current.setSessionId(sessionId);
            }

            if(delay > 0){
                setRecordingStatusText("Starting Recording...");
                setTimeout(() => {
                    recorderRef.current?.start();
                    setRecordingStatusText("Recording..."); 
                    setRecordingOn(true);
                }, delay)
            }else{
                recorderRef.current?.start();
                setRecordingStatusText("Recording..."); 
                setRecordingOn(true);
            }
        })

        socket.on("stop-recording", () => {
            setSessionId(null);
            recorderRef.current?.stop();
            setRecordingOn(false);
            setRecordingStatusText("Start Recording"); 
            toast("Please wait atleast 5 mins before Ending the call, so that complete video chunks on your device are uploaded to Cloud storage.")
        });

        socket.on("recording-error", ({ message }: { message: string }) => {
            console.warn("Recording error:", message);
            setRecordingStatusText("Start Recording"); 
            alert(message);
        });

        socket.on("set-remote-user-name", ({userName} : {userName: string}) => {
            toast(userName + " joining !");
            setRemoteUserName(userName);
        })

        return () => {
            socket.disconnect();
            if(recordingOn){
                socket.emit("stop-recording");
                recorderRef.current?.stop();
                setRecordingStatusText("Start Recording"); 
                setRecordingOn(false);
            }
        };
        
    }, [mediaReady]);

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

    const handleEndCall = () => {
        if(!socket) return;

        if(recordingOn){
            toast.error("Recording is ongoing, please wait exactly 5 mins before ending the call, to get the recording uploaded");
            socket.emit("stop-recording", {roomId});
            recorderRef.current?.stop();
            setRecordingStatusText("Start Recording"); 
            setRecordingOn(false);
            return;
        }

        socket.emit("request-end-call", {roomId});
    }

    return (
        <div className="w-[100vw] overflow-y-auto min-h-[calc(100vh-4rem)] bg-black text-white flex flex-col items-center gap-[2rem]">
            <div className="w-full flex justify-between items-center text-md font-medium p-[1rem]">
                <p>👋 Hello, <span className="font-semibold text-blue-400">{userName}</span></p>
                <div className="sm:flex hidden flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                        {
                            sessionId && (
                                <div className="max-w-[300px] text-wrap text-[0.75rem] flex items-center gap-1">
                                    <span className="font-bold">Session Id: {sessionId}</span>
                                    <FiCopy
                                        className="cursor-pointer text-[1.5rem] hover:text-blue-500 transition"
                                        onClick={() => {
                                        navigator.clipboard.writeText(sessionId);
                                        }}
                                        title="Copy Session ID"
                                    />
                                </div>
                            )
                        }
                </div>
                <p>🛋 Room: <span className="font-semibold text-green-400">{roomId}</span></p>
            </div>

            <div className="sm:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                    {
                        sessionId && (
                            <div className="max-w-[300px] text-wrap text-[0.75rem] flex items-center gap-1">
                                <span className="font-bold">Session Id: {sessionId}</span>
                                <FiCopy
                                    className="cursor-pointer text-[1.5rem] hover:text-blue-500 transition"
                                    onClick={() => {
                                    navigator.clipboard.writeText(sessionId);
                                    }}
                                    title="Copy Session ID"
                                />
                            </div>
                        )
                    }
            </div>

            <div className="flex gap-4 sm:w-[60%] w-[90%] sm:flex-row flex-col items-center justify-center">
                <div className="w-full flex flex-col items-center">
                    <p>{userName} (You)</p>
                    <div className="aspect-video w-full max-h-[300px] sm:max-h-[400px] flex items-center justify-center bg-black rounded-[1rem] border-1 border-gray-400 overflow-hidden">
                        <video
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-contain"
                            ref={localVideoRef}
                        />
                    </div>
                </div>

                <div className="w-full flex flex-col items-center">
                    <p>{remoteUserName !== null ? remoteUserName : "No User Joined Yet"}</p>
                    {!remoteUserName ? (
                        <div className="w-full aspect-video max-h-[300px] sm:max-h-[400px] border-amber-50 border-2 flex rounded-[1rem] items-center justify-center bg-black">
                            <p>Waiting to connect you to someone</p>
                        </div>
                    ) : (
                        <div className="aspect-video w-full max-h-[300px] sm:max-h-[400px] flex items-center justify-center bg-black border-1 border-gray-400 rounded-[1rem] overflow-hidden">
                            <video
                                autoPlay
                                muted = {false}
                                playsInline
                                className="w-full h-full object-contain"
                                ref={remoteVideoRef}
                            />
                        </div>
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

                <button
                    onClick={handleEndCall}
                    className="
                        w-14 cursor-pointer h-14 rounded-full flex items-center justify-center bg-red-700 hover:bg-red-800
                        transition-all duration-200 ease-in-out transform hover:scale-105 shadow-lg shadow-red-600/30
                    "
                    title="End Call"
                >
                    <BsTelephoneX className="w-6 h-6 text-white rotate-135" />
                </button>
            </div>

            <div className="relative w-full py-[1rem] text-center text-white font-semibold">Made by Abhiram T</div>
        </div>
    )
}

export default Room