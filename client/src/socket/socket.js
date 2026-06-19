import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3500';

export const socket = io(URL, {
  autoConnect: false,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 45000, // Wait longer before considering the connection dead
});
