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
        console.log("CALLED");
        if(!this.rooms.has(roomId)){
            this.rooms.set(roomId, {users: [user]});
        }else{
            const room = this.rooms.get(roomId);
            console.log("Room", room);
            if(room && room.users.length < 2){
                console.log("USER PUSHED", room, room.users);
                room.users.push(user);
            }
        }

        console.log("ROOM JOINED", this.rooms);
        user.socket.join(roomId);
        user.socket.emit("room-joined", {roomId});
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

    public onOffer(roomId: string, sdp: string, senderSocketId: string): void {
        const room = this.rooms.get(roomId);

        if(!room) return;

        const receiverUser = this.getOtherUser(roomId, senderSocketId);
        receiverUser?.socket.emit("offer", {sdp, roomId});
    }

    public onAnswer(roomId: string, sdp: string, senderSocketId: string): void {
        const room = this.rooms.get(roomId);

        if(!room) return;

        const receiverUser = this.getOtherUser(roomId, senderSocketId);
        receiverUser?.socket.emit("answer", {sdp, roomId});
    }

    public onIceCandidate(roomId: string, senderSocketId: string, candidate: any, type: "sender" | "receiver"): void {
        const room = this.rooms.get(roomId);
        if(!room) return;
        
        const receiverUser = this.getOtherUser(roomId, senderSocketId);
        receiverUser?.socket.emit("add-ice-candidate", {candidate, type, roomId});
    }

}