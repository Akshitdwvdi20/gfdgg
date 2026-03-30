const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId) => {
        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = {
                videoURL: "",
                currentTime: 0,
                isPlaying: false
            };
        }

        // Send current state to new user
        socket.emit("init", rooms[roomId]);

        socket.to(roomId).emit("user-joined", socket.id);

        // CHAT
        socket.on("chat-message", (data) => {
            io.to(roomId).emit("chat-message", data);
        });

        // VIDEO SYNC
        socket.on("video-event", (data) => {
            const room = rooms[roomId];

            if (data.type === "load") {
                room.videoURL = data.url;
                room.currentTime = 0;
                room.isPlaying = false;
            }

            if (data.type === "play") {
                room.isPlaying = true;
            }

            if (data.type === "pause") {
                room.isPlaying = false;
            }

            if (data.type === "seek") {
                room.currentTime = data.time;
            }

            socket.to(roomId).emit("video-event", data);
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
