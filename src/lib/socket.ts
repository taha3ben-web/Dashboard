import { io, Socket } from "socket.io-client";
import { getToken } from "./api";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      auth: { token: getToken() ?? "" },
      transports: ["websocket"],
      autoConnect: true,
    });
  }
  return socket;
}

export function closeSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
