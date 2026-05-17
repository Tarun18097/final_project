import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export default function useSocket({ onNewAlert, onNewLog, onReconnect }) {
  const socketRef = useRef(null);
  const cbRef     = useRef({ onNewAlert, onNewLog, onReconnect });

  // Keep callbacks fresh without re-creating socket
  useEffect(() => { cbRef.current = { onNewAlert, onNewLog, onReconnect }; });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socket.on('connect',        () => { console.log('[WS] ✅ Connected'); });
    socket.on('disconnect',     (r) => { console.log('[WS] ❌ Disconnected:', r); });
    socket.on('connect_error',  (e) => { console.warn('[WS] ⚠️ Error:', e.message); });
    socket.on('reconnect',      ()  => {
      console.log('[WS] 🔄 Reconnected — refreshing data');
      cbRef.current.onReconnect?.();
    });

    socket.on('new_alert', (alert) => cbRef.current.onNewAlert?.(alert));
    socket.on('new_log',   (log)   => cbRef.current.onNewLog?.(log));

    socketRef.current = socket;
    return () => { socket.disconnect(); socketRef.current = null; };
  }, []); // only runs once

  return socketRef;
}
