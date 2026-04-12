const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const derivedServerBaseUrl = rawApiBaseUrl
  ? rawApiBaseUrl.replace(/\/api\/?$/i, "")
  : "";

export const SERVER_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_SERVER_URL?.trim() ||
    derivedServerBaseUrl ||
    "http://localhost:5000",
);

export const API_BASE_URL = trimTrailingSlash(
  rawApiBaseUrl || `${SERVER_BASE_URL}/api`,
);

export const SOCKET_URL = trimTrailingSlash(
  import.meta.env.VITE_SOCKET_URL?.trim() || SERVER_BASE_URL,
);

export const resolveServerUrl = (path = "") =>
  new URL(path, `${SERVER_BASE_URL}/`).toString();
