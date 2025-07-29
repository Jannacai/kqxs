import { io } from "socket.io-client";

let socket;

export function getSocket() {
    if (!socket) {
        socket = io("https://backendkqxs-1.onrender.com", {
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });
    }
    return socket;
}