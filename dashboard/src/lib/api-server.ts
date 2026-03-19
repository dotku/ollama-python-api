const API_URL = process.env.OLLAMA_API_URL || "http://localhost:8000";

export async function fetchFromApi(path: string) {
  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API server error: ${res.status}`);
  }
  return res.json();
}
