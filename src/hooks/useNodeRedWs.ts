import { useEffect, useRef, useState } from 'react';

const RECONNECT_DELAY_MS = 3000;

export interface NodeRedWsResult<T> {
  data: T | null;
  error: Error | null;
  isConnected: boolean;
}

const asError = (error: unknown, fallbackMessage: string): Error => {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === 'string' && error.trim() ? error : fallbackMessage);
};

export const useNodeRedWs = <T = unknown>(url: string): NodeRedWsResult<T> => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    setData(null);
    setIsConnected(false);

    if (!url) {
      setError(new Error('Node-RED WebSocket URL is not configured.'));
      return;
    }

    setError(null);

    function scheduleReconnect() {
      if (cancelled || reconnectTimeout !== undefined) {
        return;
      }

      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = undefined;
        connectWs();
      }, RECONNECT_DELAY_MS);
    }

    function connectWs() {
      if (cancelled) {
        return;
      }

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) {
            ws.close();
            return;
          }

          setError(null);
          setIsConnected(true);
        };

        ws.onmessage = (event: MessageEvent<unknown>) => {
          if (cancelled) {
            return;
          }

          try {
            if (typeof event.data !== 'string') {
              throw new Error('The message is not JSON text.');
            }

            setData(JSON.parse(event.data) as T);
            setError(null);
          } catch (parseError) {
            const errorMessage = asError(parseError, 'Unknown JSON parsing error.');
            setError(new Error(`Failed to parse Node-RED WebSocket data: ${errorMessage.message}`));
            console.error('Failed to parse WebSocket JSON:', parseError);
          }
        };

        ws.onerror = (event) => {
          if (cancelled) {
            return;
          }

          const connectionError = new Error('Unable to connect to the Node-RED WebSocket.');
          setError(connectionError);
          console.error('Node-RED WebSocket connection error:', event);

          // onclose normally follows onerror. Scheduling here as well keeps
          // reconnection reliable, while the timer guard prevents duplicates.
          scheduleReconnect();
          ws.close();
        };

        ws.onclose = (event) => {
          if (cancelled) {
            return;
          }

          if (wsRef.current === ws) {
            wsRef.current = null;
          }

          setIsConnected(false);
          const reason = event.reason.trim();
          setError(
            new Error(
              reason
                ? `Node-RED WebSocket disconnected: ${reason}`
                : 'Node-RED WebSocket disconnected.',
            ),
          );
          scheduleReconnect();
        };
      } catch (connectionError) {
        const error = asError(connectionError, 'Unable to create the Node-RED WebSocket connection.');
        setError(new Error(`Node-RED WebSocket error: ${error.message}`));
        console.error('Failed to create WebSocket connection:', connectionError);
        scheduleReconnect();
      }
    }

    connectWs();

    return () => {
      cancelled = true;

      if (reconnectTimeout !== undefined) {
        clearTimeout(reconnectTimeout);
      }

      const ws = wsRef.current;
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
        wsRef.current = null;
      }
    };
  }, [url]);

  return { data, error, isConnected };
};
