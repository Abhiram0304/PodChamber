import { User } from "./UserManager";

interface Room {
    users: User[];
}

export class RoomManager {
    private rooms: Map<string, Room>;

    constructor() {
        this.rooms = new Map<string, Room>();
    }

    public addUserToRoom(roomId: string, user: User): void {
        if(!this.rooms.has(roomId)) this.rooms.set(roomId, {users: []});
        const room = this.rooms.get(roomId);
        if(room?.users.length === 2) return;

        room?.users.push(user);
        if(room?.users.length === 2){
            const firstUser = room.users[0];
            const secondUser = room.users[1];
            const firstUserName = firstUser?.userName;
            const secondUserName = secondUser?.userName;
            firstUser.socket.emit("set-remote-user-name", {userName: secondUserName});
            secondUser.socket.emit("set-remote-user-name", {userName: firstUserName});
            
            // setTimeout(() => {
            //     firstUser.socket.emit("send-offer", { roomId });
            // }, 2000);
            firstUser.socket.emit("send-offer", { roomId });
        }
    }

    public removeUserFromRooms(socketId: string): void {
        for(const [roomId, room] of this.rooms.entries()){
            room.users = room.users.filter(u => u.socket.id !== socketId);

            if(room.users.length === 0){
                this.rooms.delete(roomId);
            }
        }
    }

    private getOtherUser(roomId: string, senderSocketId: string): User | undefined {
        const room = this.rooms.get(roomId);
        return room?.users.find(user => user.socket.id !== senderSocketId);
    }

    public onOffer(roomId: string, sdp: RTCSessionDescriptionInit, senderSocketId: string): void {
        const room = this.rooms.get(roomId);
        if(!room) return;

        const receiverUser = this.getOtherUser(roomId, senderSocketId);
        receiverUser?.socket.emit("offer", {remoteSdp: sdp, roomId});
    }

    public onAnswer(roomId: string, sdp: RTCSessionDescriptionInit, senderSocketId: string): void {
        const room = this.rooms.get(roomId);
        if(!room) return;

        const receiverUser = this.getOtherUser(roomId, senderSocketId);
        receiverUser?.socket.emit("answer", {remoteSdp: sdp, roomId});
    }

    public onIceCandidate(roomId: string, senderSocketId: string, candidate: any): void {
        const receiverUser = this.getOtherUser(roomId, senderSocketId);
        receiverUser?.socket.emit("add-ice-candidate", { candidate, roomId });
    }

    public getRoomById(roomId: string): Room | undefined {
        const room = this.rooms.get(roomId);
        return room;
    }

    public getUserCountInRoom(roomId: string): number {
        return this.rooms.get(roomId)?.users.length || 0;
    }
}