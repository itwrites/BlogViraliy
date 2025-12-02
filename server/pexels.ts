// Pexels API service for fetching images
export async function searchPexelsImage(query: string): Promise<string | null> {
  try {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
      console.warn("[Pexels] API key not configured");
      return null;
    }

    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      console.error(`[Pexels] API error: ${response.status}`);
      return null;
    }

    const data = await response.json() as { photos: Array<{ src: { large: string } }> };
    if (data.photos && data.photos.length > 0) {
      return data.photos[0].src.large;
    }

    return null;
  } catch (error) {
    console.error("[Pexels] Error fetching image:", error);
    return null;
  }
}
