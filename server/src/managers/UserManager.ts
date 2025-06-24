import { Socket } from "socket.io";
import { RoomManager } from "./RoomManager";

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
        socket.on("offer", (sdp: string, roomId: string) => {
            this.roomManager.onOffer(roomId, sdp, socket.id);
        })

        socket.on("answer", (sdp: string, roomId: string) => {
            this.roomManager.onAnswer(roomId, sdp, socket.id);
        });

        socket.on("add-ice-candidate", (candidate: any, type: "sender" | "receiver", roomId: string) => {
            this.roomManager.onIceCandidate(roomId, socket.id, candidate, type);
        });
    }


    public joinRoom(roomId: string, userName: string, socket: Socket) : void {
        console.log("HERE");
        this.users.push({socket, userName});
        console.log("UPDATED USERS", this.users);
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