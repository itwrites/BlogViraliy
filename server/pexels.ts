// Pexels API service for fetching images

interface PexelsPhoto {
  src: { original: string; large2x: string; large: string };
}

interface PexelsResponse {
  photos: PexelsPhoto[];
  total_results: number;
}

async function fetchPexelsImages(
  apiKey: string,
  query: string,
  perPage: number = 15,
  page: number = 1
): Promise<PexelsPhoto[]> {
  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`,
    {
      headers: { Authorization: apiKey },
    }
  );

  if (!response.ok) {
    console.error(`[Pexels] API error: ${response.status}`);
    return [];
  }

  const data = (await response.json()) as PexelsResponse;
  return data.photos || [];
}

export async function searchPexelsImage(
  query: string,
  fallbackQueries?: string[],
  excludeUrls?: Set<string>
): Promise<string | null> {
  try {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
      console.warn("[Pexels] API key not configured");
      return null;
    }

    // Use random page offset (1-3) for additional variety on repeat queries
    const randomPage = Math.floor(Math.random() * 3) + 1;
    
    // Fetch 15 images with random page offset for variety
    let photos = await fetchPexelsImages(apiKey, query, 15, randomPage);

    // If few results, try page 1 (most results are usually on page 1)
    if (photos.length < 5 && randomPage > 1) {
      photos = await fetchPexelsImages(apiKey, query, 15, 1);
    }

    // If still few results and fallback queries provided, try them
    if (photos.length < 3 && fallbackQueries && fallbackQueries.length > 0) {
      for (const fallback of fallbackQueries) {
        const fallbackPhotos = await fetchPexelsImages(apiKey, fallback, 15, 1);
        if (fallbackPhotos.length >= 3) {
          photos = fallbackPhotos;
          break;
        }
        // Merge results if partial success
        if (fallbackPhotos.length > photos.length) {
          photos = fallbackPhotos;
        }
      }
    }

    // If still no results, try a more generic version of the query
    if (photos.length < 2) {
      // Extract first 2 words as a more generic search
      const genericQuery = query.split(/\s+/).slice(0, 2).join(" ");
      if (genericQuery !== query && genericQuery.length > 3) {
        const genericPhotos = await fetchPexelsImages(apiKey, genericQuery, 15, 1);
        if (genericPhotos.length > photos.length) {
          photos = genericPhotos;
        }
      }
    }

    if (photos.length > 0) {
      // Filter out already-used URLs if exclusion set provided
      let availablePhotos = photos;
      if (excludeUrls && excludeUrls.size > 0) {
        availablePhotos = photos.filter(photo => {
          const url = photo.src.large2x || photo.src.large;
          return !excludeUrls.has(url);
        });
      }
      
      // If all photos are excluded, use original list (better than nothing)
      if (availablePhotos.length === 0) {
        availablePhotos = photos;
      }
      
      // Randomly select an image from available results
      const randomIndex = Math.floor(Math.random() * availablePhotos.length);
      const selectedPhoto = availablePhotos[randomIndex];

      // Use large2x for high-resolution retina quality (940×650px @ DPR 2)
      // Falls back to large if large2x is unavailable
      return selectedPhoto.src.large2x || selectedPhoto.src.large;
    }

    return null;
  } catch (error) {
    console.error("[Pexels] Error fetching image:", error);
    return null;
  }
}
