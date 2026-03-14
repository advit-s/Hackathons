import { useState, useEffect, useCallback, useRef } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export function useWebSocket(sessionId, poseName) {
    const [connected, setConnected] = useState(false);
    const [poseData, setPoseData] = useState(null);
    const [error, setError] = useState(null);

    const wsRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY = 3000;

    const frameInterval = 200; // 5 FPS (Stabler for tunnels)

    const isProcessingRef = useRef(false);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return; // Already connected
        }

        try {
            const ws = new WebSocket(`${WS_URL}/ws/pose/${sessionId}?pose_name=${poseName}`);

            ws.onopen = () => {
                console.log('✅ WebSocket connected');
                setConnected(true);
                setError(null);
                reconnectAttemptsRef.current = 0;
                isProcessingRef.current = false;
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setPoseData(data);
                } catch (err) {
                    console.error('Failed to parse WebSocket message:', err);
                } finally {
                    // Ack received, ready for next frame
                    isProcessingRef.current = false;
                }
            };

            ws.onerror = (event) => {
                console.error('❌ WebSocket error:', event);
                setError('Connection error');
                isProcessingRef.current = false;
            };

            ws.onclose = (event) => {
                console.log('WebSocket closed:', event.code, event.reason);
                setConnected(false);
                wsRef.current = null;
                isProcessingRef.current = false;

                // Auto-reconnect if not intentionally closed
                if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttemptsRef.current++;
                    console.log(`Attempting to reconnect... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

                    reconnectTimerRef.current = setTimeout(() => {
                        connect();
                    }, RECONNECT_DELAY);
                }
            };

            wsRef.current = ws;
        } catch (err) {
            console.error('Failed to create WebSocket:', err);
            setError('Failed to connect');
        }
    }, [sessionId, poseName]);

    const disconnect = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
        }

        if (wsRef.current) {
            wsRef.current.close(1000, 'User disconnected');
            wsRef.current = null;
        }

        setConnected(false);
        setPoseData(null);
        reconnectAttemptsRef.current = 0;
        isProcessingRef.current = false;
    }, []);

    const sendFrame = useCallback((blob) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            // Adaptive flow control: drop frame if backend is still processing
            if (isProcessingRef.current) {
                // Optional: console.debug('Dropping frame - backend busy');
                return;
            }

            isProcessingRef.current = true;
            wsRef.current.send(blob);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        connected,
        poseData,
        error,
        connect,
        disconnect,
        sendFrame,
        frameInterval
    };
}
