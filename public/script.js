const socket = io();

let roomId = null;
const video = document.getElementById("video");

/* ================= JOIN ROOM ================= */
function joinRoom() {
    roomId = document.getElementById("roomInput").value.trim();
    if (!roomId) return alert("Enter room ID");

    socket.emit("join-room", roomId);
}

/* ================= INIT STATE ================= */
socket.on("init", (data) => {
    if (data.videoURL) {
        video.src = data.videoURL;
        video.currentTime = data.currentTime;

        if (data.isPlaying) {
            video.play();
        }
    }
});

/* ================= LOAD VIDEO ================= */
function loadVideo() {
    const url = document.getElementById("videoURL").value;
    video.src = url;

    socket.emit("video-event", {
        type: "load",
        url,
        roomId
    });
}

/* ================= SYNC EVENTS ================= */

video.addEventListener("play", () => {
    socket.emit("video-event", {
        type: "play",
        roomId
    });
});

video.addEventListener("pause", () => {
    socket.emit("video-event", {
        type: "pause",
        roomId
    });
});

video.addEventListener("seeked", () => {
    socket.emit("video-event", {
        type: "seek",
        time: video.currentTime,
        roomId
    });
});

/* ================= RECEIVE SYNC ================= */

socket.on("video-event", (data) => {
    if (data.type === "load") {
        video.src = data.url;
    }

    if (data.type === "play") {
        video.play();
    }

    if (data.type === "pause") {
        video.pause();
    }

    if (data.type === "seek") {
        video.currentTime = data.time;
    }
});

/* ================= CHAT ================= */

function sendMsg() {
    const input = document.getElementById("msg");
    const message = input.value.trim();
    if (!message) return;

    const data = {
        user: "User-" + socket.id.slice(0, 4),
        message
    };

    socket.emit("chat-message", data);
    input.value = "";
}

socket.on("chat-message", (data) => {
    const div = document.getElementById("messages");

    const msg = document.createElement("div");
    msg.innerHTML = `<b>${data.user}:</b> ${data.message}`;

    div.appendChild(msg);
    div.scrollTop = div.scrollHeight;
});
