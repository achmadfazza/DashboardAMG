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
  /** Node-RED REST API base URL, e.g. "http://172.17.173.164:1880". */
  readonly VITE_NODE_RED_API_BASE_URL: string;
  /** Node-RED REST path for power meter history, appended to the base URL. */
  readonly VITE_NODE_RED_API_POWER_METER_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
