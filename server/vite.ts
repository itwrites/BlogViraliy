import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createServer as createViteServer, createLogger, type ViteDevServer } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { storage } from "./storage";
import type { Site, Post } from "@shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getDistDir(): string {
  if (process.env.NODE_ENV === "production") {
    return path.dirname(process.argv[1]);
  }
  return __dirname;
}

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

function resolveHostname(req: express.Request): string {
  const xBvVisitorHost = req.headers["x-bv-visitor-host"];
  const xForwardedHost = req.headers["x-forwarded-host"];
  const xOriginalHost = req.headers["x-original-host"];
  const xRealHost = req.headers["x-real-host"];
  
  return (
    (typeof xBvVisitorHost === "string" ? xBvVisitorHost.split(",")[0].trim().split(":")[0] : null) ||
    (typeof xForwardedHost === "string" ? xForwardedHost.split(",")[0].trim().split(":")[0] : null) ||
    (typeof xOriginalHost === "string" ? xOriginalHost.split(":")[0] : null) ||
    (typeof xRealHost === "string" ? xRealHost.split(":")[0] : null) ||
    req.hostname
  );
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
  fullPath: string,
  template: string,
  isAliasDomain: boolean
): Promise<string> {
  try {
    const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
    const ssrData = await getSSRData(site, routePath);
    
    // For alias domains: pass stripped path (no basePath) since Router base is ""
    // For primary domains: pass full path with basePath since Router base is basePath
    const ssrPath = isAliasDomain ? routePath : fullPath;
    const { html, dehydratedState } = render({
      site,
      path: routePath,
      ssrPath,
      isAliasDomain,
      ...ssrData,
    });

    const ssrDataScript = `<script>window.__SSR_DATA__ = ${JSON.stringify({
      site,
      dehydratedState,
      ssrPath,
      isAliasDomain,
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
        __dirname,
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

      const hostname = resolveHostname(req);
      log(`[SSR-Dev] Request: ${hostname}${url}`, "ssr");
      const site = await storage.getSiteByDomain(hostname);
      log(`[SSR-Dev] Site lookup: ${site ? `found (${site.id})` : 'not found'}`, "ssr");
      
      if (site && isPublicRoute(url)) {
        const basePath = normalizeBasePath(site.basePath);
        const fullPath = url.split("?")[0];
        let routePath = fullPath;
        if (basePath && routePath.startsWith(basePath)) {
          routePath = routePath.slice(basePath.length) || "/";
        }
        
        // Determine if accessed via alias domain
        const isAliasDomain = hostname !== site.domain;

        log(`[SSR] Rendering ${hostname}${url} -> route: ${routePath}, fullPath: ${fullPath}, isAlias=${isAliasDomain}`, "ssr");
        const page = await renderSSR(vite, site, routePath, fullPath, template, isAliasDomain);
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

export async function serveStatic(app: Express) {
  const distDir = getDistDir();
  const distPath = path.resolve(distDir, "public");
  const ssrPath = path.resolve(distDir, "server", "entry-server.js");
  
  log(`[SSR] distDir: ${distDir}, distPath: ${distPath}, ssrPath: ${ssrPath}`, "ssr");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  let ssrRender: ((ctx: any) => { html: string; dehydratedState: unknown }) | null = null;
  
  if (fs.existsSync(ssrPath)) {
    try {
      const ssrUrl = pathToFileURL(ssrPath).href;
      log(`[SSR] Loading SSR bundle from: ${ssrUrl}`, "ssr");
      const ssrModule = await import(ssrUrl);
      ssrRender = ssrModule.render;
      log("[SSR] SSR module loaded successfully", "ssr");
    } catch (e) {
      console.error("[SSR] Failed to load SSR module:", e);
      log(`[SSR] Error loading module: ${e instanceof Error ? e.message : String(e)}`, "ssr");
    }
  } else {
    log(`[SSR] SSR module not found at ${ssrPath}, falling back to client-only rendering`, "ssr");
  }

  const templatePath = path.resolve(distPath, "index.html");
  const template = fs.readFileSync(templatePath, "utf-8");

  app.use(express.static(distPath, {
    index: false,
  }));

  app.use("*", async (req, res) => {
    const url = req.originalUrl;
    
    try {
      const hostname = resolveHostname(req);
      log(`[SSR-Prod] Request: ${hostname}${url}, ssrRender=${!!ssrRender}`, "ssr");
      const site = await storage.getSiteByDomain(hostname);
      log(`[SSR-Prod] Site lookup: ${site ? `found (${site.id})` : 'not found'}, isPublic=${isPublicRoute(url)}`, "ssr");
      
      if (site && ssrRender && isPublicRoute(url)) {
        const basePath = normalizeBasePath(site.basePath);
        const fullPath = url.split("?")[0];
        let routePath = fullPath;
        if (basePath && routePath.startsWith(basePath)) {
          routePath = routePath.slice(basePath.length) || "/";
        }
        
        // Determine if accessed via alias domain
        const isAliasDomain = hostname !== site.domain;
        // For alias domains: pass stripped path (no basePath) since Router base is ""
        // For primary domains: pass full path with basePath since Router base is basePath
        const ssrPath = isAliasDomain ? routePath : fullPath;

        log(`[SSR-Prod] Rendering ${hostname}${url} -> route: ${routePath}, fullPath: ${fullPath}, ssrPath: ${ssrPath}, isAlias=${isAliasDomain}`, "ssr");
        
        const ssrData = await getSSRData(site, routePath);
        const { html, dehydratedState } = ssrRender({
          site,
          path: routePath,
          ssrPath,
          isAliasDomain,
          ...ssrData,
        });

        const ssrDataScript = `<script>window.__SSR_DATA__ = ${JSON.stringify({
          site,
          dehydratedState,
          ssrPath,
          isAliasDomain,
        }).replace(/</g, "\\u003c")}</script>`;

        const page = template
          .replace(`<div id="root"></div>`, `<div id="root">${html}</div>`)
          .replace(`</head>`, `${ssrDataScript}</head>`);

        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } else {
        res.sendFile(templatePath);
      }
    } catch (e) {
      console.error("[SSR Error]", e);
      res.sendFile(templatePath);
    }
  });
}
