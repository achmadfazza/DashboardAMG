/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend auth API origin, e.g. "http://localhost:5000". */
  readonly VITE_API_BASE_URL: string;
  /** Node-RED live power stream (WebSocket). */
  readonly VITE_NODE_RED_WS_URL: string;
  /** Node-RED power meter history endpoint (REST GET, last 12 hours). */
  readonly VITE_NODE_RED_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
