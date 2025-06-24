import { useSelector } from "react-redux";
import type { RootState } from "../reducers";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const Room = () => {

    const userName = useSelector((state: RootState) => state.app.userName)
    const roomId = useSelector((state: RootState) => state.app.roomId)

    const [lobby, setLobby] = useState<boolean>(true)
    const [socket, setSocket] = useState<Socket | null>(null)
    const [senderPc, setSenderPc] = useState<null | RTCPeerConnection>(null)    
    const [receiverPc, setReceiverPc] = useState<null | RTCPeerConnection>(null)
    const localVideoTrackRef = useRef<MediaStreamTrack | null>(null);
    const localAudioTrackRef = useRef<MediaStreamTrack | null>(null);
    const [remoteVideoTrack, setRemoteVideoTrack] = useState<null | MediaStreamTrack>(null) 
    const [remoteAudioTrack, setRemoteAudioTrack] = useState<null | MediaStreamTrack>(null) 
    const [remoteMediaStream, setRemoteMediaStream] = useState<null | MediaStream>(null)    
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
    const localVideoRef = useRef<HTMLVideoElement | null>(null)

    const getMedia = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        console.log("LOCAL TRACKS", videoTrack, audioTrack);
        localAudioTrackRef.current = audioTrack;
        localVideoTrackRef.current = videoTrack;

        if(!localVideoRef.current) return;

        localVideoRef.current.srcObject = new MediaStream([videoTrack]);
        localVideoRef.current.play();
    }

    useEffect(() => {
        getMedia();
    }, []);

    useEffect(() => {

        const socket: Socket = io("http://localhost:3000");
        console.log("SOCKET ID", socket);

        socket.emit("join-room", {roomId, userName});
        
        socket.on("send-offer", async({roomId} : {roomId : string}) => {
            console.log("🚀 CREATING SENDER - first offer", localVideoTrackRef.current, localAudioTrackRef.current);
            setLobby(false);
            const pc = new RTCPeerConnection();

            // Create local stream
            const stream = new MediaStream();
            if(localVideoTrackRef.current){
                console.log("ADDED LOCAL VIDEO TRACK TO SENDER");
                stream.addTrack(localVideoTrackRef.current);
            }
            if(localAudioTrackRef.current){
                console.log("ADDED LOCAL AUDIO TRACK TO SENDER");
                stream.addTrack(localAudioTrackRef.current);
            }

            // Add all tracks with the stream parameter
            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });

            // Set up ontrack handler for receiving remote media
            pc.ontrack = (event) => {
                console.log("🎥 SENDER PC ON TRACK EVENT", event);
                const [remoteStream] = event.streams;
                if(remoteVideoRef.current && remoteStream){
                    console.log("📺 SENDER: Setting remote stream to video element");
                    remoteVideoRef.current.srcObject = remoteStream;
                    remoteVideoRef.current.play().catch(console.error);
                }
            };

            pc.onicecandidate = (event) => {
                if(event.candidate){
                    console.log("🧊 SENDER ICE candidate", event.candidate);
                    socket.emit("add-ice-candidate", {
                        candidate: event.candidate,
                        roomId: roomId,
                        type: "sender",
                    })
                }
            }

            pc.onnegotiationneeded = async() => {
                console.log("🤝 SENDER negotiation needed");
                const sdp = await pc.createOffer();
                await pc.setLocalDescription(sdp);
                socket.emit("offer", {sdp, roomId});
            }

            setSenderPc(pc);
        })

        socket.on("offer", async({remoteSdp, roomId} : {remoteSdp: RTCSessionDescriptionInit, roomId: string}) => {
            console.log("📨 RECEIVED OFFER", remoteSdp, roomId);
            setLobby(false);
            const pc = new RTCPeerConnection();
            
            // Set up ontrack handler FIRST, before setting remote description
            pc.ontrack = (event) => {
                console.log("🎥 RECEIVER ON TRACK EVENT", event);
                const [remoteStream] = event.streams;
                if(remoteVideoRef.current && remoteStream){
                    console.log("📺 RECEIVER: Setting remote stream to video element");
                    remoteVideoRef.current.srcObject = remoteStream;
                    remoteVideoRef.current.play().catch(console.error);
                }
            };

            // Create local stream and add tracks
            const stream = new MediaStream();
            if(localVideoTrackRef.current){
                console.log("ADDED LOCAL VIDEO TRACK TO RECEIVER");
                stream.addTrack(localVideoTrackRef.current);
            }
            if(localAudioTrackRef.current){
                console.log("ADDED LOCAL AUDIO TRACK TO RECEIVER");
                stream.addTrack(localAudioTrackRef.current);
            }

            // Add tracks to peer connection with stream parameter
            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });

            await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp));
            const sdp = await pc.createAnswer();
            console.log("📤 RECEIVER NEW SDP", sdp);
            await pc.setLocalDescription(sdp);

            pc.onicecandidate = (event) => {
                if(!event.candidate) return;
                console.log("🧊 RECEIVER ICE candidate", event.candidate);

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

        socket.on("answer", ({roomId, remoteSdp} : {roomId: string, remoteSdp: RTCSessionDescriptionInit}) => {
            console.log("📨 RECEIVED ANSWER", remoteSdp);
            setLobby(false);
            setSenderPc(pc => {
                if(pc) {
                    pc.setRemoteDescription(remoteSdp);
                    console.log("✅ SENDER: Set remote description from answer");
                }
                return pc;
            });
        })

        socket.on("lobby", () => {
            setLobby(true);
        })

        socket.on("add-ice-candidate", ({ candidate, type}) => {
            console.log("🧊 RECEIVED ICE CANDIDATE", { candidate, type });
            
            // FIXED: Proper ICE candidate routing
            if(type === "sender"){
                // ICE candidate from sender should go to receiver PC
                setReceiverPc(pc => {
                    if(pc) {
                        console.log("🧊 Adding sender ICE candidate to receiver PC");
                        pc.addIceCandidate(candidate).catch(console.error);
                    }
                    return pc; 
                })
            }else{
                // ICE candidate from receiver should go to sender PC  
                setSenderPc(pc => {
                    if(pc) {
                        console.log("🧊 Adding receiver ICE candidate to sender PC");
                        pc.addIceCandidate(candidate).catch(console.error);
                    }
                    return pc;
                })
            }
        });

        setSocket(socket);
        
        // Cleanup
        return () => {
            socket.disconnect();
        };
        
    }, [userName, roomId]);


    return (
        <div className="w-[100vw] h-[100vh] bg-[rgb(0,0,0)] text-white flex flex-col items-center gap-[2rem]">
            <div className="w-full flex justify-between items-center gap-[2rem] p-[2rem]">
                <p>HELLO: {userName}</p>
                <p>Room: {roomId}</p>
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
        </div>
    )
}

export default Room