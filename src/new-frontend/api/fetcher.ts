export const customFetch = async (url: string, options: RequestInit) => {
  const response = await fetch(url, { ...options, credentials: "include" });

  const contentType = response.headers.get("content-type") || "";

  let data: any;

  try {
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text(); // fallback
    }
  } catch (e) {
    console.error("Error parsing response body:", e);
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || `HTTP error ${response.status}`);
  }

  return data;
};
