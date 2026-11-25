export const aiFetch = async (path: string, init: RequestInit = {}) => {
  const baseUrl = process.env.AI_SERVICE_URL;
  const apiKey = process.env.AI_SERVICE_API_KEY;
  if (!baseUrl) throw new Error("AI_SERVICE_URL is not defined");
  if (!apiKey) throw new Error("AI_SERVICE_API_KEY is not defined");

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
      "X-API-Key": apiKey,
    },
  });
};
