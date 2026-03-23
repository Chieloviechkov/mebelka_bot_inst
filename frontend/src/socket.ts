import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('token');
    // In production, connect to Railway backend; in dev, to localhost
    const url = window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : 'https://mebelkabotinst-production.up.railway.app';

    socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => console.log('[WS] connected'));
    socket.on('disconnect', () => console.log('[WS] disconnected'));
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
