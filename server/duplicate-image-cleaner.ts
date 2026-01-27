import { storage } from "./storage";
import { searchPexelsImage } from "./pexels";

const stopWords = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "must", "shall", "can", "need",
  "this", "that", "these", "those", "i", "you", "he", "she", "it", "we",
  "they", "what", "which", "who", "whom", "how", "why", "when", "where",
  "your", "my", "our", "their", "its", "his", "her", "as", "if", "so",
  "than", "then", "just", "only", "also", "even", "more", "most", "very",
  "too", "now", "here", "there", "all", "any", "each", "every", "both",
  "few", "many", "some", "such", "no", "not", "own", "same", "other"
]);

function extractKeywords(title: string): string {
  const words = title.toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  return words.slice(0, 4).join(" ");
}

export async function cleanDuplicateImagesForSite(siteId: string): Promise<{
  success: boolean;
  updated: number;
  failed: number;
  duplicateGroups: number;
}> {
  try {
    console.log(`[Duplicate Image Cleaner] Starting cleanup for site ${siteId}`);
    
    const allPosts = await storage.getPostsBySiteId(siteId);
    
    const imageGroups = new Map<string, Array<{ id: string; title: string }>>();
    for (const post of allPosts) {
      if (post.imageUrl) {
        const existing = imageGroups.get(post.imageUrl) || [];
        existing.push({ id: post.id, title: post.title });
        imageGroups.set(post.imageUrl, existing);
      }
    }
    
    const duplicateGroups = Array.from(imageGroups.entries())
      .filter(([_, posts]) => posts.length > 1);
    
    if (duplicateGroups.length === 0) {
      console.log(`[Duplicate Image Cleaner] No duplicate images found for site ${siteId}`);
      return { success: true, updated: 0, failed: 0, duplicateGroups: 0 };
    }
    
    console.log(`[Duplicate Image Cleaner] Found ${duplicateGroups.length} duplicate image groups`);
    
    const usedImageUrls = new Set<string>();
    for (const post of allPosts) {
      if (post.imageUrl) {
        usedImageUrls.add(post.imageUrl);
      }
    }
    
    let totalUpdated = 0;
    let totalFailed = 0;
    
    for (const [duplicateUrl, posts] of duplicateGroups) {
      const postsToFix = posts.slice(1);
      
      for (const post of postsToFix) {
        try {
          const keywords = extractKeywords(post.title);
          
          if (!keywords) {
            console.log(`[Duplicate Image Cleaner] Could not extract keywords for post "${post.title}"`);
            totalFailed++;
            continue;
          }
          
          const newImageUrl = await searchPexelsImage(keywords, undefined, usedImageUrls);
          
          if (!newImageUrl) {
            console.log(`[Duplicate Image Cleaner] No Pexels image found for "${post.title}"`);
            totalFailed++;
            continue;
          }
          
          await storage.updatePost(post.id, { imageUrl: newImageUrl });
          usedImageUrls.add(newImageUrl);
          totalUpdated++;
          
          console.log(`[Duplicate Image Cleaner] Updated image for "${post.title}"`);
        } catch (error) {
          console.error(`[Duplicate Image Cleaner] Error updating post "${post.title}":`, error);
          totalFailed++;
        }
      }
    }
    
    console.log(`[Duplicate Image Cleaner] Completed for site ${siteId}. Updated: ${totalUpdated}, Failed: ${totalFailed}`);
    
    return {
      success: true,
      updated: totalUpdated,
      failed: totalFailed,
      duplicateGroups: duplicateGroups.length,
    };
  } catch (error) {
    console.error(`[Duplicate Image Cleaner] Error:`, error);
    return {
      success: false,
      updated: 0,
      failed: 0,
      duplicateGroups: 0,
    };
  }
}
