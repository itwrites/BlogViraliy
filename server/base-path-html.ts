import express, { type Express, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { normalizeBasePath } from "./utils";

export function rewriteAssetPaths(html: string, basePath: string): string {
  const normalizedBase = normalizeBasePath(basePath);
  
  if (!normalizedBase) {
    return html;
  }
  
  let result = html;
  
  result = result.replace(/href="\/assets\//g, `href="${normalizedBase}/assets/`);
  result = result.replace(/src="\/assets\//g, `src="${normalizedBase}/assets/`);
  result = result.replace(/href="\/favicon/g, `href="${normalizedBase}/favicon`);
  
  result = result.replace(
    /<\/head>/,
    `  <script>
      window.__BASE_PATH__ = "${normalizedBase}";
    </script>
  </head>`
  );
  
  return result;
}

export async function getHtmlForDomain(hostname: string, htmlContent: string): Promise<string> {
  const site = await storage.getSiteByDomain(hostname);
  
  if (!site || !site.basePath) {
    return htmlContent;
  }
  
  return rewriteAssetPaths(htmlContent, site.basePath);
}

export function serveStaticWithBasePath(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use("*", async (req: Request, res: Response) => {
    try {
      const htmlPath = path.resolve(distPath, "index.html");
      const htmlContent = await fs.promises.readFile(htmlPath, "utf-8");
      const html = await getHtmlForDomain(req.hostname, htmlContent);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      console.error("Error serving HTML:", error);
      res.sendFile(path.resolve(distPath, "index.html"));
    }
  });
}

export function setupBasePathAssetMiddleware(app: Express) {
  app.use(async (req: Request, res: Response, next) => {
    const site = await storage.getSiteByDomain(req.hostname);
    
    if (!site?.basePath) {
      return next();
    }
    
    const normalizedBase = normalizeBasePath(site.basePath);
    
    if (!normalizedBase) {
      return next();
    }
    
    if (req.path.startsWith(normalizedBase + "/")) {
      req.url = req.url.replace(normalizedBase, "");
    }
    
    next();
  });
}
