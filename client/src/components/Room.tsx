import { useSelector } from "react-redux";
import type { RootState } from "../reducers";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const Room = () => {

    const userName = useSelector((state: RootState) => state.app.userName)
    const roomId = useSelector((state: RootState) => state.app.roomId)
    const localAudioTrack = useSelector((state: RootState) => state.app.localAudioTrack)
    const localVideoTrack = useSelector((state: RootState) => state.app.localVideoTrack)

    const [lobby, setLobby] = useState<boolean>(true)
    const [socket, setSocket] = useState<Socket | null>(null)
    const [senderPc, setSenderPc] = useState<null | RTCPeerConnection>(null)    
    const [receiverPc, setReceiverPc] = useState<null | RTCPeerConnection>(null)   
    const [remoteVideoTrack, setRemoteVideoTrack] = useState<null | MediaStreamTrack>(null) 
    const [remoteAudioTrack, setRemoteAudioTrack] = useState<null | MediaStreamTrack>(null) 
    const [remoteMediaStream, setRemoteMediaStream] = useState<null | MediaStream>(null)    
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
    const localVideoRef = useRef<HTMLVideoElement | null>(null)

    useEffect(() => {
        if(localVideoRef.current){
            if(localVideoTrack){
                localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
                localVideoRef.current.play();
            }
        }
    }, [localVideoTrack])

    useEffect(() => {
        const socket: Socket = io("http://localhost:3000");

        socket.emit("join-room", {roomId, userName});
        
        socket.on("send-offer", async({roomId: String}) => {
            setLobby(false);
            const pc = new RTCPeerConnection();

            setSenderPc(pc);
            if(localVideoTrack){
                console.log("ADDED LOCAL VIDEO TRACK");
                pc.addTrack(localVideoTrack);
            }
            if(localAudioTrack){
                console.log("ADDED LOCAL AUDIO TRACK");
                pc.addTrack(localAudioTrack);
            }

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
                pc.setLocalDescription(sdp);
                socket.emit("offer", {sdp, roomId});
            }
        })

        socket.on("offer", async({roomId, remoteSdp}) => {
            setLobby(false);
            const pc = new RTCPeerConnection();
            pc.setRemoteDescription(remoteSdp);
            const sdp = await pc.createAnswer();
            pc.setLocalDescription(sdp);

            const stream = new MediaStream();
            if(remoteVideoRef.current){
                remoteVideoRef.current.srcObject = stream;
            }

            setRemoteMediaStream(stream);
            setReceiverPc(pc);
            // window.pcr = pc;

            pc.ontrack = (event) => {
                if(remoteVideoRef.current){
                    if (!remoteVideoRef.current.srcObject) {
                        remoteVideoRef.current.srcObject = new MediaStream();
                    }
                    //@ts-ignore
                    remoteVideoRef.current.srcObject.addTrack(event.track);
                }
            }

            pc.onicecandidate = (event) => {
                if(!event.candidate) return;

                socket.emit("add-ice-candidate", {
                    candidate: event.candidate,
                    roomId: roomId,
                    type: "receiver",
                })
            }

            socket.emit("answer", {
                sdp,
                roomId,
            })
        })

        socket.on("answer", ({roomId, remoteSdp}) => {
            setLobby(false);
            setSenderPc(pc => {
                pc?.setRemoteDescription(remoteSdp);
                return pc;
            });
        })

        socket.on("lobby", () => {
            setLobby(true);
        })

        socket.on("add-ice-candidate", ({ candidate, type}) => {
            if(type === "sender"){
                setReceiverPc(pc => {
                    pc?.addIceCandidate(candidate);
                    return pc; 
                })
            }else{
                setSenderPc(pc => {
                    pc?.addIceCandidate(candidate);
                    return pc;
                })
            }
        });

        setSocket(socket);
  }, [userName]);


  return (
    <div className="w-[100vw] h-[100vh] bg-[rgb(0,0,0)] text-white flex flex-col items-center gap-[2rem]">
        <div className="w-full flex justify-between items-center gap-[2rem] p-[2rem]">
            <p>HELLO: {userName}</p>
            <p>Room: {roomId}</p>
        </div>

        <div>
            <video autoPlay width={400} className="border-amber-50 border-2" ref={localVideoRef} />
            {lobby ? "Waiting to connect you to someone" : null}
            <video autoPlay width={400} className="border-amber-50 border-2" ref={remoteVideoRef} />
        </div>
    </div>
  )
}

export default Room