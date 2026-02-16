import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // Force re-render when socket changes
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    // Initialize socket connection
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      socketRef.current = socket;
      forceUpdate(prev => prev + 1); // Trigger re-render
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    return () => {
      socket?.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Safe to return ref.current here because forceUpdate ensures re-renders
  /* eslint-disable react-hooks/refs */
  return {
    socket: socketRef.current,
    isConnected,
  };
  /* eslint-enable react-hooks/refs */
}
