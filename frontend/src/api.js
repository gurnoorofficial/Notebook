const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export function apiUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}

export async function fetchJson(path, options = {}) {
  const response = await fetch(apiUrl(path), options);

  const text = await response.text();

  let data = null;

  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Backend returned invalid response. HTTP ${response.status}`);
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.error || data?.message || `Request failed. HTTP ${response.status}`
    );
  }

  if (data === null) {
    throw new Error(`Backend returned an empty response. HTTP ${response.status}`);
  }

  return data;
}
