import { Socket } from "socket.io";
import { RoomManager } from "./RoomManager";
import { s3Uploader } from "../utilities/s3Uploader";
import { v4 as uuidv4 } from 'uuid';

export interface User {
    socket: Socket;
    userName: string;
}

export class UserManager {
    private users: User[];
    private roomManager: RoomManager;

    constructor(){
        this.users = [];
        this.roomManager = new RoomManager();
    }

    public initHandlers(socket: Socket) : void {
        socket.on("offer", ({sdp, roomId} : {sdp: RTCSessionDescriptionInit, roomId: string}) => {
            this.roomManager.onOffer(roomId, sdp, socket.id);
        })

        socket.on("answer", ({sdp, roomId} : {sdp: RTCSessionDescriptionInit, roomId: string}) => {
            this.roomManager.onAnswer(roomId, sdp, socket.id);
        });

        socket.on("add-ice-candidate", ({candidate, type, roomId} : {candidate: any, type: "sender" | "receiver", roomId: string}) => {
            this.roomManager.onIceCandidate(roomId, socket.id, candidate, type);
        });

        socket.on("prepare-for-recording", ({roomId, startTime} : {roomId: string, startTime: number}) => {
            const room = this.roomManager.getRoomById(roomId);
            const userCount = this.roomManager.getUserCountInRoom(roomId);

            if(!room) return;

            if(userCount < 2){
                console.log("EMIT EROR");
                socket.emit("recording-error", {message: "Less than 2 users in the PodCell"});
                return;
            }

            const sessionId = `${roomId}-${Date.now()}-${uuidv4()}`;
            console.log(`Recording session started: ${sessionId}`);

            room.users.forEach((user) => {
                user.socket.emit("start-recording-at", {startTime, sessionId});
            })
        })

        socket.on("stop-recording", ({roomId}: {roomId: string}) => {
            const room = this.roomManager.getRoomById(roomId);
            room?.users.forEach((user) => {
                user.socket.emit("stop-recording");
            })
        })

        socket.on("get-presigned-url", async (
            { roomId, userName, chunkIndex, sessionId } : { roomId: string, userName: string, chunkIndex: number, sessionId: string },
            callback
        ) => {
            const result = await s3Uploader({ roomId, userName, chunkIndex, sessionId });
            callback(result);
        });

        socket.on("request-end-call", async(
            { roomId } : { roomId: string }
        ) => {
                const room = this.roomManager.getRoomById(roomId);
                room?.users.forEach((user) => {
                    user.socket.emit("confirm-end-call");
                })
            }
        )
    }


    public joinRoom(roomId: string, userName: string, socket: Socket) : void {
        this.users.push({socket, userName});
        this.roomManager.addUserToRoom(roomId, {socket, userName});
        this.initHandlers(socket);
    }

    public removeUser(socketId: string) : void {
        const user = this.users.find(user => user.socket.id === socketId);
        if(!user) return;

        this.users = this.users.filter(user => user.socket.id !== socketId);
        this.roomManager.removeUserFromRooms(socketId);
    }
}