'use client';

/**
 * useNotificationWebSocket
 *
 * Maintains a persistent WebSocket connection to the live notification endpoint:
 *   ws://<host>/ws/notifications/?token=<jwt>
 *
 * Usage:
 *   const { latestNotification, markRead, wsStatus } = useNotificationWebSocket();
 *
 * - latestNotification: the most recently pushed notification (triggers UI badge bump).
 * - markRead(id): sends mark_read over the WebSocket.
 * - wsStatus: 'connecting' | 'open' | 'closed' | 'error'
 *
 * Callers should still load the initial list via the REST API on mount; this hook
 * only handles incremental live pushes after that.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type WsStatus = 'connecting' | 'open' | 'closed' | 'error';

export interface LiveNotification {
  id: string;
  title: string;
  message: string;
  link: string;
  created_at: string;
}

function getWsBase(): string {
  if (typeof window === 'undefined') return '';
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const backendHost = process.env.NEXT_PUBLIC_WS_HOST || window.location.host;
  return `${proto}://${backendHost}`;
}

export function useNotificationWebSocket(opts?: {
  onNotification?: (n: LiveNotification) => void;
}) {
  const wsRef = useRef<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<WsStatus>('closed');
  const [latestNotification, setLatestNotification] = useState<LiveNotification | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onNotificationRef = useRef(opts?.onNotification);
  onNotificationRef.current = opts?.onNotification;

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('access_token');
    if (!token) return;

    if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) {
      wsRef.current.close();
    }

    const url = `${getWsBase()}/ws/notifications/?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setWsStatus('connecting');

    ws.onopen = () => {
      setWsStatus('open');
      // Send a ping every 30s to keep the connection alive
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30_000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === 'notification') {
          const notif: LiveNotification = {
            id: msg.id,
            title: msg.title,
            message: msg.message,
            link: msg.link || '',
            created_at: msg.created_at,
          };
          setLatestNotification(notif);
          onNotificationRef.current?.(notif);
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => setWsStatus('error');

    ws.onclose = (e) => {
      setWsStatus('closed');
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      // Auto-reconnect unless normal close or auth failure
      if (e.code !== 1000 && e.code !== 4001) {
        setTimeout(connect, 5000);
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      wsRef.current?.close(1000, 'unmount');
    };
  }, [connect]);

  const markRead = useCallback((notificationId: string) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'mark_read', notification_id: notificationId }));
    }
  }, []);

  return { latestNotification, markRead, wsStatus };
}
