import { Server, Socket } from "socket.io";
import { UserManager } from "./managers/UserManager";
import http from "http";
import express from "express";
import videoRoutes from './routes/videoRoutes'
import cors from 'cors';

const app = express();
app.use(express.json());

app.use(
    cors({
        origin : "*",
        credentials:true,
    })
)

app.use("/api", videoRoutes);

const server = http.createServer(app);
const userManager = new UserManager();

const io = new Server(server, {
    cors:{
        origin: "*",
    }
});

io.on("connection", (socket: Socket) => {
  console.log("a user connected", socket.id);

  socket.on("join-room", ({ roomId, userName }) => {
    console.log(`${userName} joining room ${roomId}`);
    userManager.joinRoom(roomId, userName, socket);
  });
    
  socket.on("disconnect", () => {
    console.log("user disconnected", socket.id);
    userManager.removeUser(socket.id);
  });
});

server.listen(3000, () => {
  console.log("Server listening on http://localhost:3000");
});
