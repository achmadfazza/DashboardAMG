/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend auth API origin, e.g. "http://localhost:5000". */
  readonly VITE_API_BASE_URL: string;
  /** Node-RED WebSocket base URL, e.g. "ws://172.17.173.164:1880/ws". */
  readonly VITE_NODE_RED_WS_BASE_URL: string;
  /** Node-RED WebSocket path for on-grid power, appended to the base URL. */
  readonly VITE_NODE_RED_ON_GRID_PATH: string;
  /** Node-RED WebSocket path for solar power, appended to the base URL. */
  readonly VITE_NODE_RED_ON_SOLAR_PATH: string;
  /** Node-RED power meter history endpoint (REST GET, last 12 hours). */
  readonly VITE_NODE_RED_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
