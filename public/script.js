const socket = io();

let roomId = null;
let peer = null;
let localStream = null;

/* =========================
   JOIN ROOM
========================= */
function joinRoom() {
    roomId = document.getElementById("roomInput").value.trim();

    if (!roomId) {
        alert("Enter Room ID");
        return;
    }

    socket.emit("join-room", roomId);

    console.log("Joined room:", roomId);
}

/* =========================
   SOCKET EVENTS
========================= */

// When another user joins
socket.on("user-joined", (userId) => {
    console.log("User joined:", userId);
    createPeer(userId, true);
});

// Receive signaling data
socket.on("signal", async (data) => {
    const { from, signal } = data;

    if (!peer) {
        createPeer(from, false);
    }

    try {
        // OFFER
        if (signal.type === "offer") {
            await peer.setRemoteDescription(new RTCSessionDescription(signal));

            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);

            socket.emit("signal", {
                to: from,
                signal: answer
            });
        }

        // ANSWER
        else if (signal.type === "answer") {
            await peer.setRemoteDescription(new RTCSessionDescription(signal));
        }

        // ICE CANDIDATE
        else if (signal.candidate) {
            await peer.addIceCandidate(new RTCIceCandidate(signal));
        }

    } catch (err) {
        console.error("Signal error:", err);
    }
});

// Chat messages
socket.on("chat-message", (data) => {
    addMessage(data.user, data.message);
});

/* =========================
   CREATE PEER
========================= */
function createPeer(userId, initiator) {
    peer = new RTCPeerConnection({
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" } // Free STUN
        ]
    });

    console.log("Peer created");

    // Add local stream if exists
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peer.addTrack(track, localStream);
        });
    }

    // Receive remote stream
    peer.ontrack = (event) => {
        document.getElementById("video").srcObject = event.streams[0];
    };

    // Send ICE candidates
    peer.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("signal", {
                to: userId,
                signal: event.candidate
            });
        }
    };

    // If initiator → create offer
    if (initiator) {
        peer.onnegotiationneeded = async () => {
            try {
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);

                socket.emit("signal", {
                    to: userId,
                    signal: offer
                });
            } catch (err) {
                console.error("Offer error:", err);
            }
        };
    }
}

/* =========================
   SCREEN SHARE
========================= */
async function startShare() {
    try {
        localStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });

        document.getElementById("video").srcObject = localStream;

        // Add tracks if peer exists
        if (peer) {
            localStream.getTracks().forEach(track => {
                peer.addTrack(track, localStream);
            });
        }

        // Handle stop sharing
        localStream.getVideoTracks()[0].onended = () => {
            console.log("Screen sharing stopped");
        };

    } catch (err) {
        console.error("Screen share error:", err);
    }
}

/* =========================
   CHAT SYSTEM
========================= */
function sendMsg() {
    const input = document.getElementById("msg");
    const message = input.value.trim();

    if (!message) return;

    socket.emit("chat-message", message);

    addMessage("Me", message);
    input.value = "";
}

// Add message to UI
function addMessage(user, message) {
    const container = document.getElementById("messages");

    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message");

    msgDiv.innerHTML = `<b>${user.slice(0,5)}:</b> ${message}`;

    container.appendChild(msgDiv);

    // Auto scroll
    container.scrollTop = container.scrollHeight;
}

/* =========================
   ENTER KEY SUPPORT
========================= */
document.getElementById("msg").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        sendMsg();
    }
});