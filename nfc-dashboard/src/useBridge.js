/**
 * React hook for connecting to the squircle-nfc-bridge WebSocket server.
 * Provides reactive state for bridge status, reader, tag, and history events.
 */
import { useState, useEffect, useCallback, useRef } from "react";

const DEFAULT_URL = "ws://localhost:7891";
const RECONNECT_DELAY = 3000;

export function useBridge(url = DEFAULT_URL) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const requestId = useRef(0);
  const pendingRequests = useRef(new Map());

  const [bridgeStatus, setBridgeStatus] = useState("disconnected");
  const [readerStatus, setReaderStatus] = useState("disconnected");
  const [readerName, setReaderName] = useState(null);
  const [tag, setTag] = useState(null);
  const [latency, setLatency] = useState(null);
  const [bridgeVersion, setBridgeVersion] = useState(null);
  const [history, setHistory] = useState([]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setBridgeStatus("connected");
        // Fetch existing history from bridge
        const id = ++requestId.current;
        ws.send(JSON.stringify({ id, action: "history" }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          const { event, id } = msg;

          // Handle pending request responses (skip broadcast events whose id
          // field is a history-entry ID that could collide with request IDs)
          const isBroadcast = event === "history:entry" || event === "heartbeat";
          if (id && !isBroadcast && pendingRequests.current.has(id)) {
            const { resolve, reject } = pendingRequests.current.get(id);
            pendingRequests.current.delete(id);
            if (event === "error") {
              reject(new Error(msg.message || "Operation failed"));
            } else {
              if (msg.tag) setTag(msg.tag);
              resolve(msg);
            }
          }

          switch (event) {
            case "bridge:status":
              setBridgeVersion(msg.version);
              if (msg.reader?.connected) {
                setReaderStatus("connected");
                setReaderName(msg.reader.name);
              }
              if (msg.tag) setTag(msg.tag);
              break;

            case "reader:connect":
              setReaderStatus("connected");
              setReaderName(msg.name);
              break;

            case "reader:disconnect":
              setReaderStatus("disconnected");
              setReaderName(null);
              setTag(null);
              break;

            case "tag:connect":
              setTag(msg);
              break;

            case "tag:disconnect":
              setTag(null);
              break;

            case "tag:updated":
              setTag(msg);
              break;

            case "history:result":
              if (msg.history) setHistory(msg.history);
              break;

            case "history:entry":
              setHistory(prev => [msg, ...prev].slice(0, 100));
              break;

            case "heartbeat":
              setLatency(Date.now() - msg.timestamp);
              break;

            case "error":
              console.error("[bridge]", msg.message);
              break;
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        setBridgeStatus("disconnected");
        setReaderStatus("disconnected");
        setReaderName(null);
        setTag(null);
        wsRef.current = null;

        // Auto-reconnect
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
      };

      ws.onerror = () => {
        // onclose will fire after this
      };
    } catch {
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    }
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const sendCommand = useCallback((action, payload = {}) => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error("Bridge not connected"));
        return;
      }

      const id = ++requestId.current;
      pendingRequests.current.set(id, { resolve, reject });

      wsRef.current.send(JSON.stringify({ id, action, payload }));

      // Timeout after 10s
      setTimeout(() => {
        if (pendingRequests.current.has(id)) {
          pendingRequests.current.delete(id);
          reject(new Error("Request timed out"));
        }
      }, 10000);
    });
  }, []);

  const readTag = useCallback(() => sendCommand("read"), [sendCommand]);
  const writeTag = useCallback((records) => sendCommand("write", { records }), [sendCommand]);
  const eraseTag = useCallback(() => sendCommand("erase"), [sendCommand]);
  const lockTag = useCallback(() => sendCommand("lock"), [sendCommand]);
  const clearHistory = useCallback(() => sendCommand("clearHistory").then(() => setHistory([])), [sendCommand]);
  const labelHistory = useCallback((historyId, label) => sendCommand("labelHistory", { historyId, label }).then((msg) => {
    setHistory(prev => prev.map(h => h.id === historyId ? { ...h, label: msg.label } : h));
  }), [sendCommand]);

  return {
    bridgeStatus,
    readerStatus,
    readerName,
    tag,
    latency,
    bridgeVersion,
    history,
    readTag,
    writeTag,
    eraseTag,
    lockTag,
    clearHistory,
    labelHistory,
  };
}
