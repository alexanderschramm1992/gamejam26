import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { GameServer } from "./game/GameServer";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const publicPath = path.resolve(process.cwd(), "public");
const gameServer = new GameServer(io);

app.use(express.static(publicPath));
app.get("*", (_request, response) => {
  response.sendFile(path.join(publicPath, "index.html"));
});

io.on("connection", (socket) => {
  gameServer.addSocket(socket);
});

gameServer.start();

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`Pizza Panic Protocol listening on http://localhost:${port}`);
});
