import { Server, Socket } from "socket.io";
import { UserManager } from "./managers/UserManager";
import http from "http";
import express from "express";
import videoRoutes from './routes/videoRoutes'
import cors from 'cors';
import cron from "node-cron";
import axios from "axios";

interface CleanupResponse {
  success: boolean;
  deletedCount?: number;
  message: string;
}

const app = express();
app.use(express.json());

app.use(
    cors({
        origin : "*",
        credentials:true,
    })
)

app.get("/", (_, res) => {
    res.json({ message: "Server is running" });
});

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

cron.schedule("*/1 * * * *", async (): Promise<void> => {
  try{
    console.log("Running internal cron job: pinging POST /deleteOldVideoCronJob");
    const url = `${process.env.SERVER_BASE_URL}/api/deleteOldVideoCronJob`;
    console.log("URL", url);
    const response = await axios.post(
      `${process.env.SERVER_BASE_URL}/api/deleteOldVideoCronJob`,
      { secretKey: process.env.SECRET_KEY }
    );

    console.log("Cleanup response:", response.data);
  }catch(err: any){
    console.log("CRON Job failed: ", err.message || err);
  }
});