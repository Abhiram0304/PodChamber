import { useSelector } from "react-redux";
import type { RootState } from "../reducers";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import createMediaRecorder from "../utilities/MediaRecorder";
import type { RecorderType } from "../types";
import { BsMic, BsMicMute, BsCameraVideo, BsCameraVideoOff } from 'react-icons/bs';
import { S3Uploader, type S3Config } from "../utilities/S3uploader";

const Room = () => {

    const userName = useSelector((state: RootState) => state.app.userName)
    const roomId = useSelector((state: RootState) => state.app.roomId)

    const [lobby, setLobby] = useState<boolean>(true)
    const [_socket, setSocket] = useState<Socket | null>(null)
    const [_senderPc, setSenderPc] = useState<null | RTCPeerConnection>(null)    
    const [_receiverPc, setReceiverPc] = useState<null | RTCPeerConnection>(null)
    const [recordingOn, setRecordingOn] = useState<boolean>(false);
    const [recorder, setRecorder] = useState<null | RecorderType>(null);
    const localVideoTrackRef = useRef<MediaStreamTrack | null>(null);
    const localAudioTrackRef = useRef<MediaStreamTrack | null>(null);
    // const [remoteVideoTrack, setRemoteVideoTrack] = useState<null | MediaStreamTrack>(null) 
    // const [remoteAudioTrack, setRemoteAudioTrack] = useState<null | MediaStreamTrack>(null) 
    // const [remoteMediaStream, setRemoteMediaStream] = useState<null | MediaStream>(null)    
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
    const localVideoRef = useRef<HTMLVideoElement | null>(null)
    const [audioMuted, setAudioMuted] = useState<boolean>(false);
    const [videoMuted, setVideoMuted] = useState<boolean>(false);
    // const [s3Uploader, setS3Uploader] = useState<S3Uploader | null>(null);
    const s3UploaderRef = useRef<S3Uploader | null>(null);

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
                // This callback will still run for logging/monitoring
                console.log(`Chunk received: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
                
                // Local download as fallback (optional)
                if (!s3UploaderRef.current) {
                    console.log("LOCAL DOWNLOAD", s3UploaderRef.current);
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
            10000, // 10 seconds
            {
                s3Uploader: s3UploaderRef.current,
                roomId: roomId,
                userName: userName,
                enableLocalDownload: !s3UploaderRef.current // Download locally if S3 not available
            }
        );
        setRecorder(recorder);

        if(!localVideoRef.current) return;

        localVideoRef.current.srcObject = new MediaStream([videoTrack]);
        localVideoRef.current.play();
    }

    // useEffect(() => {
    //     // getMedia();
    // }, []);

    useEffect(() => {
        const socket: Socket = io("http://localhost:3000");
        // const socket: Socket = io("https://podchamber.onrender.com");

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
                if(pc) {
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

        setSocket(socket);
        
        return () => {
            socket.disconnect();
            if(recordingOn){
                recorder?.stop();
                setRecordingOn(false);
            }
        };
        
    }, [userName, roomId]);

    const recordingHandler = () => {
        if(recordingOn){
            recorder?.stop();
            setRecordingOn(false);
        }else{
            recorder?.start();
            setRecordingOn(true);
        }
    }

    useEffect(() => {
        try {
            const uploader = new S3Uploader('video-recordings/');
            console.log("Uploaded", uploader);
            s3UploaderRef.current = uploader;
            console.log('S3 uploader initialized');
            getMedia();
        } catch (error) {
            console.error('Failed to initialize S3 uploader:', error);
            console.warn('S3 upload will be disabled. Check your environment variables.');
        }
    }, []);


    return (
        <div className="w-[100vw] h-[100vh] bg-black text-white flex flex-col items-center gap-[2rem]">
            <div className="w-full flex justify-between items-center text-lg font-medium p-[1.5rem]">
                <p>👋 Hello, <span className="font-semibold text-blue-400">{userName}</span></p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <p className={`font-bold ${recordingOn ? "text-red-500" : "text-gray-400"}`}>
                        🎙 Recording: {recordingOn ? "ON" : "OFF"}
                        {s3UploaderRef.current && recordingOn && <span className="text-green-400 ml-2">→ S3</span>}
                    </p>

                    <button
                        onClick={recordingHandler}
                        className={`px-6 py-2 rounded-xl font-semibold transition duration-300 ${
                            recordingOn
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                    >
                        {recordingOn ? "⏹ Stop Recording" : "⏺ Start Recording"}
                    </button>
                </div>
                <div className="text-sm text-gray-400">
                    S3 Upload: {s3UploaderRef.current ? "✅ Ready" : "❌ Not configured"}
                </div>
                <p>🛋 Room: <span className="font-semibold text-green-400">{roomId}</span></p>
            </div>

            

            <div className="flex gap-4 sm:w-[60%] w-[90%] sm:flex-row flex-col items-center justify-center">
                <div className="w-full flex flex-col items-center">
                    <p>Local Video (You)</p>
                    <video autoPlay muted className="border-amber-50 w-full border-2 rounded-[1rem]" ref={localVideoRef} />
                </div>
                
                <div className="w-full sm:h-full h-[300px] flex flex-col items-center">
                    <p>Remote Video (Other User)</p>
                    {lobby ? (
                        <div className="w-full h-full border-amber-50 border-2 flex rounded-[1rem] items-center justify-center">
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
                        relative w-14 h-14 rounded-full flex items-center justify-center
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
                        relative w-14 h-14 rounded-full flex items-center justify-center
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

            <div className="w-full text-center text-white font-semibold">Made by Abhiram T</div>
        </div>
    )
}

export default Room