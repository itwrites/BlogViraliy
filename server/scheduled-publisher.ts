import { storage } from "./storage";
import type { Post } from "@shared/schema";

export async function publishScheduledPosts(): Promise<{
  publishedCount: number;
  errors: string[];
}> {
  const now = new Date();
  const errors: string[] = [];
  let publishedCount = 0;

  try {
    const allSites = await storage.getSites();
    
    for (const site of allSites) {
      try {
        const posts = await storage.getPostsBySiteId(site.id);
        const scheduledPosts = posts.filter(
          (post) =>
            post.status === "draft" &&
            post.scheduledPublishDate &&
            new Date(post.scheduledPublishDate) <= now
        );

        for (const post of scheduledPosts) {
          try {
            await storage.updatePost(post.id, {
              status: "published",
            });
            publishedCount++;
            console.log(
              `[Scheduled Publisher] Published post "${post.title}" (${post.id}) for site ${site.id}`
            );
          } catch (postError) {
            const errorMsg = `Failed to publish post ${post.id}: ${postError instanceof Error ? postError.message : "Unknown error"}`;
            errors.push(errorMsg);
            console.error(`[Scheduled Publisher] ${errorMsg}`);
          }
        }
      } catch (siteError) {
        const errorMsg = `Failed to process site ${site.id}: ${siteError instanceof Error ? siteError.message : "Unknown error"}`;
        errors.push(errorMsg);
        console.error(`[Scheduled Publisher] ${errorMsg}`);
      }
    }
  } catch (error) {
    const errorMsg = `Failed to get sites: ${error instanceof Error ? error.message : "Unknown error"}`;
    errors.push(errorMsg);
    console.error(`[Scheduled Publisher] ${errorMsg}`);
  }

  if (publishedCount > 0) {
    console.log(`[Scheduled Publisher] Published ${publishedCount} posts`);
  }

  return { publishedCount, errors };
}

export async function getScheduledPostsForSite(siteId: string): Promise<Post[]> {
  const posts = await storage.getPostsBySiteId(siteId);
  return posts.filter(
    (post) =>
      post.status === "draft" &&
      post.scheduledPublishDate &&
      new Date(post.scheduledPublishDate) > new Date()
  );
}

export async function getUpcomingScheduleForSite(
  siteId: string
): Promise<{ posts: Post[]; scheduledDates: Date[] }> {
  const posts = await storage.getPostsBySiteId(siteId);
  
  const scheduledPosts = posts
    .filter(
      (post) =>
        post.scheduledPublishDate &&
        (post.status === "draft" || new Date(post.scheduledPublishDate) > new Date())
    )
    .sort((a, b) => {
      const dateA = new Date(a.scheduledPublishDate!);
      const dateB = new Date(b.scheduledPublishDate!);
      return dateA.getTime() - dateB.getTime();
    });

  const scheduledDates = scheduledPosts
    .filter((p) => p.scheduledPublishDate)
    .map((p) => new Date(p.scheduledPublishDate!));

  return { posts: scheduledPosts, scheduledDates };
}

export async function reschedulePost(
  postId: string,
  newDate: Date
): Promise<Post | null> {
  const post = await storage.getPostById(postId);
  if (!post) return null;

  await storage.updatePost(postId, {
    scheduledPublishDate: newDate,
  });

  const updated = await storage.getPostById(postId);
  return updated ?? null;
}
