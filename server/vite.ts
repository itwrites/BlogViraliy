import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger, type ViteDevServer } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { storage } from "./storage";
import type { Site, Post } from "@shared/schema";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

function normalizeBasePath(basePath: string | null | undefined): string {
  if (!basePath) return "";
  let normalized = basePath.trim();
  if (!normalized.startsWith("/")) normalized = "/" + normalized;
  if (normalized.endsWith("/")) normalized = normalized.slice(0, -1);
  return normalized;
}

function isPublicRoute(path: string): boolean {
  const adminPaths = ["/admin", "/editor", "/bv_api", "/api"];
  return !adminPaths.some(p => path.startsWith(p));
}

async function getSSRData(site: Site, routePath: string): Promise<{
  posts?: Post[];
  post?: Post;
  relatedPosts?: Post[];
  tagPosts?: Post[];
  currentTag?: string;
}> {
  const postUrlFormat = (site.postUrlFormat as "with-prefix" | "root") || "with-prefix";
  
  if (routePath === "/" || routePath === "") {
    const posts = await storage.getPostsBySiteId(site.id);
    return { posts };
  }

  const postMatch = routePath.match(/^\/post\/(.+)$/);
  if (postMatch) {
    const slug = postMatch[1];
    const post = await storage.getPostBySlug(site.id, slug);
    if (post) {
      const relatedPosts = await storage.getRelatedPosts(post.id, site.id);
      return { post, relatedPosts };
    }
  }

  if (postUrlFormat === "root") {
    const slugMatch = routePath.match(/^\/([^\/]+)$/);
    if (slugMatch && !routePath.startsWith("/tag/") && !routePath.startsWith("/topics/")) {
      const slug = slugMatch[1];
      const post = await storage.getPostBySlug(site.id, slug);
      if (post) {
        const relatedPosts = await storage.getRelatedPosts(post.id, site.id);
        return { post, relatedPosts };
      }
    }
  }

  const tagMatch = routePath.match(/^\/tag\/(.+)$/);
  if (tagMatch) {
    const tag = decodeURIComponent(tagMatch[1]);
    const allPosts = await storage.getPostsBySiteId(site.id);
    const tagPosts = allPosts.filter((p: Post) => 
      p.tags?.some((t: string) => t.toLowerCase() === tag.toLowerCase())
    );
    return { tagPosts, currentTag: tag };
  }

  return {};
}

async function renderSSR(
  vite: ViteDevServer,
  site: Site,
  routePath: string,
  template: string
): Promise<string> {
  try {
    const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
    const ssrData = await getSSRData(site, routePath);
    
    const { html, dehydratedState } = render({
      site,
      path: routePath,
      ...ssrData,
    });

    const ssrDataScript = `<script>window.__SSR_DATA__ = ${JSON.stringify({
      site,
      dehydratedState,
    }).replace(/</g, "\\u003c")}</script>`;

    return template
      .replace(`<div id="root"></div>`, `<div id="root">${html}</div>`)
      .replace(`</head>`, `${ssrDataScript}</head>`);
  } catch (e) {
    vite.ssrFixStacktrace(e as Error);
    console.error("[SSR Error]", e);
    return template;
  }
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      template = await vite.transformIndexHtml(url, template);

      const hostname = req.hostname;
      const site = await storage.getSiteByDomain(hostname);
      
      if (site && isPublicRoute(url)) {
        const basePath = normalizeBasePath(site.basePath);
        let routePath = url.split("?")[0];
        if (basePath && routePath.startsWith(basePath)) {
          routePath = routePath.slice(basePath.length) || "/";
        }

        log(`[SSR] Rendering ${hostname}${url} -> route: ${routePath}`, "ssr");
        const page = await renderSSR(vite, site, routePath, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } else {
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      }
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
