const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit("user-joined", socket.id);

        socket.on("signal", (data) => {
            io.to(data.to).emit("signal", {
                from: socket.id,
                signal: data.signal
            });
        });

        socket.on("chat-message", (msg) => {
            io.to(roomId).emit("chat-message", {
                user: socket.id,
                message: msg
            });
        });
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});