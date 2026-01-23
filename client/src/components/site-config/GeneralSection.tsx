import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Link, Plus, X } from "lucide-react";
import { cardVariants } from "./variants";
import type { SetState, SiteDataState } from "./types";

type GeneralSectionProps = {
  siteData: SiteDataState;
  setSiteData: SetState<SiteDataState>;
  newDomainAlias: string;
  setNewDomainAlias: SetState<string>;
  addDomainAlias: () => void;
  removeDomainAlias: (alias: string) => void;
};

export function GeneralSection({
  siteData,
  setSiteData,
  newDomainAlias,
  setNewDomainAlias,
  addDomainAlias,
  removeDomainAlias,
}: GeneralSectionProps) {
  return (
    <div className="space-y-8">
      <motion.div
        custom={0}
        variants={cardVariants}
        initial="initial"
        animate="animate"
      >
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl tracking-tight" data-testid="text-general-title">Site Information</CardTitle>
            <CardDescription data-testid="text-general-description">Set up your site's identity and routing. Visual branding and themes live in Look & Feel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Site Identity
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="domain" data-testid="label-domain">Primary Domain</Label>
                <Input
                  id="domain"
                  data-testid="input-domain"
                  placeholder="example.com"
                  value={siteData.domain}
                  onChange={(e) => setSiteData({ ...siteData, domain: e.target.value })}
                />
                <p className="text-xs text-muted-foreground" data-testid="text-domain-hint">Enter your domain without https:// (e.g., myblog.com). This must match your DNS configuration.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" data-testid="label-title">Site Title</Label>
                <Input
                  id="title"
                  data-testid="input-title"
                  placeholder="My Awesome Blog"
                  value={siteData.title}
                  onChange={(e) => setSiteData({ ...siteData, title: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Displayed in the browser tab and site header. Keep it short and memorable.</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">Branding assets and theme presets live in Look & Feel.</p>

            <div className="border-t pt-6 mt-6">
              <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Link className="w-4 h-4" /> Domains & Routing
              </div>
              <p className="text-xs text-muted-foreground">Use aliases for www/alternate domains and configure reverse proxy access when needed.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3 md:col-span-2">
                <Label data-testid="label-domain-aliases">Domain Aliases</Label>
                <p className="text-xs text-muted-foreground mb-3">Additional domains that will also serve this site's content</p>
                <div className="flex gap-2">
                  <Input
                    id="newAlias"
                    data-testid="input-new-alias"
                    placeholder="www.example.com or alias.example.com"
                    value={newDomainAlias}
                    onChange={(e) => setNewDomainAlias(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addDomainAlias();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addDomainAlias}
                    data-testid="button-add-alias"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 mt-2">
                  {(siteData.domainAliases || []).map((alias) => (
                    <div
                      key={alias}
                      className="flex items-center justify-between bg-muted px-3 py-2 rounded-md"
                      data-testid={`alias-${alias}`}
                    >
                      <span className="text-sm font-mono truncate flex-1">{alias}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDomainAlias(alias)}
                        data-testid={`button-remove-alias-${alias}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {(!siteData.domainAliases || siteData.domainAliases.length === 0) && (
                    <p className="text-sm text-muted-foreground italic">No domain aliases configured</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 md:col-span-2">
                <Label htmlFor="basePath" data-testid="label-base-path">Base Path (Optional)</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Path prefix for reverse proxy deployments. If you're hosting the blog under a subdirectory
                  (e.g., yoursite.com/blog), enter the path prefix here (e.g., /blog). Leave empty for root deployment.
                </p>
                <Input
                  id="basePath"
                  data-testid="input-base-path"
                  placeholder="/blog (optional, leave empty for root)"
                  value={siteData.basePath}
                  onChange={(e) => {
                    let value = e.target.value.trim();
                    // Ensure it starts with / if not empty, and doesn't end with /
                    if (value && !value.startsWith('/')) {
                      value = '/' + value;
                    }
                    if (value.endsWith('/') && value.length > 1) {
                      value = value.slice(0, -1);
                    }
                    setSiteData({ ...siteData, basePath: value });
                  }}
                />
                {siteData.basePath && (
                  <p className="text-xs text-muted-foreground">
                    URLs will be prefixed: <span className="font-mono text-primary">{siteData.domain}{siteData.basePath}/post/example-article</span>
                  </p>
                )}
              </div>

              <div className="space-y-3 md:col-span-2">
                <Label data-testid="label-deployment-mode">Deployment Mode</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Choose how this site is accessed. Use "Standalone" for direct domain access (e.g., blog.example.com),
                  or "Reverse Proxy" when accessing via a shared deployment domain with visitor hostname identification.
                </p>
                <Select
                  value={siteData.deploymentMode}
                  onValueChange={(value: "standalone" | "reverse_proxy") => setSiteData({ ...siteData, deploymentMode: value })}
                >
                  <SelectTrigger data-testid="select-deployment-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standalone">Standalone (direct domain)</SelectItem>
                    <SelectItem value="reverse_proxy">Reverse Proxy (shared host)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {siteData.deploymentMode === "reverse_proxy" && (
                <div className="space-y-3 md:col-span-2">
                  <Label htmlFor="proxyVisitorHostname" data-testid="label-proxy-visitor-hostname">Visitor Hostname</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    The domain visitors use to access this site (e.g., vyfy.co.uk). When requests come through
                    the shared deployment domain with X-BV-Visitor-Host header matching this value, this site will be served.
                  </p>
                  <Input
                    id="proxyVisitorHostname"
                    data-testid="input-proxy-visitor-hostname"
                    placeholder="vyfy.co.uk"
                    value={siteData.proxyVisitorHostname}
                    onChange={(e) => {
                      let value = e.target.value.trim().toLowerCase();
                      // Clean up the hostname (remove protocol, path, port)
                      value = value.replace(/^(https?:)?\/\//, "").split("/")[0].split(":")[0];
                      setSiteData({ ...siteData, proxyVisitorHostname: value });
                    }}
                  />
                  {siteData.proxyVisitorHostname && (
                    <p className="text-xs text-muted-foreground">
                      Nginx config: <span className="font-mono text-primary">proxy_set_header X-BV-Visitor-Host {siteData.proxyVisitorHostname};</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
