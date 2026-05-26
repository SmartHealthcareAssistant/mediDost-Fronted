// socket.js (GLOBAL SOCKET INSTANCE)
import { io } from "socket.io-client";

const getSocketUrl = () => {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:5000";
  }
  return "https://medidost-backend.onrender.com";
};

const socket = io(getSocketUrl(), {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export default socket;
