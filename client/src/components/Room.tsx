import { useSelector } from "react-redux";
import type { RootState } from "../reducers";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import createMediaRecorder from "../utilities/MediaRecorder";
import type { RecorderType } from "../types";

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

    const getMedia = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        localAudioTrackRef.current = audioTrack;
        localVideoTrackRef.current = videoTrack;

        const recorder = createMediaRecorder(stream, async (blob) => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `recording-chunk-${timestamp}.webm`;
            console.log("FOLENAME", fileName);

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();

            // Optional: revoke the URL after some time to release memory
            setTimeout(() => URL.revokeObjectURL(url), 100);
        });
        setRecorder(recorder);

        if(!localVideoRef.current) return;

        localVideoRef.current.srcObject = new MediaStream([videoTrack]);
        localVideoRef.current.play();
    }

    useEffect(() => {
        getMedia();
    }, []);

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


    return (
        <div className="w-[100vw] h-[100vh] bg-[rgb(0,0,0)] text-white flex flex-col items-center gap-[2rem]">
            <div className="w-full flex justify-between items-center text-lg font-medium p-[1.5rem]">
                <p>👋 Hello, <span className="font-semibold text-blue-400">{userName}</span></p>
                <p>🛋 Room: <span className="font-semibold text-green-400">{roomId}</span></p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className={`font-bold ${recordingOn ? "text-red-500" : "text-gray-400"}`}>🎙 Recording: {recordingOn ? "ON" : "OFF"}</p>

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

            <div className="flex gap-4">
                <div className="flex flex-col items-center">
                    <p>Local Video (You)</p>
                    <video autoPlay muted width={400} className="border-amber-50 border-2" ref={localVideoRef} />
                </div>
                
                <div className="flex flex-col items-center">
                    <p>Remote Video (Other User)</p>
                    {lobby ? (
                        <div className="w-[400px] h-[300px] border-amber-50 border-2 flex items-center justify-center">
                            <p>Waiting to connect you to someone</p>
                        </div>
                    ) : (
                        <video autoPlay width={400} className="border-amber-50 border-2" ref={remoteVideoRef} />
                    )}
                </div>
            </div>
            <div className="w-full text-center text-white font-semibold">Made by Abhiram T</div>
        </div>
    )
}

export default Room