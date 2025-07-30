import { io } from "socket.io-client";

let socket;

export function getSocket() {
    if (!socket) {
        socket = io("http://localhost:5000", {
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });
    }
    return socket;
}