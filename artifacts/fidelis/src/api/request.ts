const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "https://latest-orion-api-server.vercel.app";

/**
 * Simple request wrapper (NO Clerk yet)
 * This works with your current backend bypass
 */
export async function request(
  path: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }

  return res.json();
}