import { Switch, Route, Router, useRoute, useLocation } from "wouter";
import { memo, useEffect } from "react";
import { BasePathProvider, normalizeBasePath } from "@/components/base-path-provider";
import { PublicShell } from "@/components/public-shell";
import { ThemedHomePage } from "@/components/themed-home-page";
import { PublicPostContent } from "@/pages/public-post";
import { PublicTagArchiveContent } from "@/pages/public-tag-archive";
import { PublicTopicGroupContent } from "@/pages/public-topic-group";
import NotFound from "@/pages/not-found";
import type { Site } from "@shared/schema";

function PostRouteHandler({ site, slug }: { site: Site; slug: string }) {
  const [, setLocation] = useLocation();
  const postUrlFormat = (site.postUrlFormat as "with-prefix" | "root") || "with-prefix";
  
  useEffect(() => {
    if (postUrlFormat === "root") {
      setLocation(`/${slug}`, { replace: true });
    }
  }, [postUrlFormat, slug, setLocation]);
  
  if (postUrlFormat === "with-prefix") {
    return <PublicPostContent site={site} slug={slug} />;
  }
  
  return null;
}

function RootSlugRouteHandler({ site, slug }: { site: Site; slug: string }) {
  const [, setLocation] = useLocation();
  const postUrlFormat = (site.postUrlFormat as "with-prefix" | "root") || "with-prefix";
  
  useEffect(() => {
    if (postUrlFormat === "with-prefix") {
      setLocation(`/post/${slug}`, { replace: true });
    }
  }, [postUrlFormat, slug, setLocation]);
  
  if (postUrlFormat === "root") {
    return <PublicPostContent site={site} slug={slug} />;
  }
  
  return null;
}

const PublicRoutes = memo(function PublicRoutes({ site }: { site: Site }) {
  return (
    <Switch>
      <Route path="/">
        <ThemedHomePage site={site} />
      </Route>
      <Route path="/post/:slug">
        {(params) => <PostRouteHandler site={site} slug={params.slug} />}
      </Route>
      <Route path="/tag/:tag">
        {(params) => <PublicTagArchiveContent site={site} tag={params.tag} />}
      </Route>
      <Route path="/topics/:groupSlug">
        {(params) => <PublicTopicGroupContent site={site} groupSlug={params.groupSlug} />}
      </Route>
      <Route path="/:slug">
        {(params) => <RootSlugRouteHandler site={site} slug={params.slug} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
});

function PublicShellWrapper({ site }: { site: Site }) {
  const [matchTag, paramsTag] = useRoute("/tag/:tag");
  const [matchTopics, paramsTopics] = useRoute("/topics/:groupSlug");
  const currentTag = matchTag ? paramsTag?.tag : null;
  const currentGroupSlug = matchTopics ? paramsTopics?.groupSlug : null;

  return (
    <PublicShell site={site} currentTag={currentTag} currentGroupSlug={currentGroupSlug}>
      <PublicRoutes site={site} />
    </PublicShell>
  );
}

interface PublicAppProps {
  site: Site;
  ssrPath?: string;
  isAliasDomain?: boolean;
}

export function PublicApp({ site, ssrPath, isAliasDomain }: PublicAppProps) {
  // For alias domains, the proxy already stripped the basePath, so use empty base
  // For primary domains with basePath, use the basePath as router base
  const basePath = isAliasDomain ? "" : normalizeBasePath(site.basePath);

  return (
    <BasePathProvider site={site} isAliasDomain={isAliasDomain}>
      <Router base={basePath} ssrPath={ssrPath}>
        <PublicShellWrapper site={site} />
      </Router>
    </BasePathProvider>
  );
}
