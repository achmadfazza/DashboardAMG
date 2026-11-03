// Event dispatched when the backend rejects the auth token (e.g. expired).
export const AUTH_SESSION_EXPIRED_EVENT = "auth:session-expired";

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("token");
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  // 401 = token missing / expired / invalid → clear session and force re-login
  if (response.status === 401) {
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
  }

  return response;
}
