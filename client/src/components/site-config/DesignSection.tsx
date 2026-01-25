import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Globe, ImageIcon, Layout, Palette, Settings, Sparkles, Type, X } from "lucide-react";
import type { TemplateSettings } from "@shared/schema";
import { cardVariants } from "./variants";
import type { SetState, SiteDataState } from "./types";

type DesignSectionProps = {
  siteData: SiteDataState;
  setSiteData: SetState<SiteDataState>;
  templateSettings: TemplateSettings;
  setTemplateSettings: SetState<TemplateSettings>;
};

export function DesignSection({ siteData, setSiteData, templateSettings, setTemplateSettings }: DesignSectionProps) {
  return (
                <div className="space-y-8">
                  <div className="bg-muted/50 rounded-xl p-4 border border-border">
                    <div className="flex items-start gap-3">
                      <Palette className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Design settings control the visual appearance of your public site</p>
                        <p className="text-xs text-muted-foreground mt-1">Pick a theme and brand assets, then customize typography, colors, layout, and visual effects.</p>
                      </div>
                    </div>
                  </div>
  
                  <motion.div
                    custom={0}
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                  >
                  <Card className="rounded-2xl overflow-hidden">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl tracking-tight" data-testid="text-design-title">Look & Feel Settings</CardTitle>
                      <CardDescription data-testid="text-design-description">Choose a theme and branding, then fine-tune fonts, colors, spacing, and visual effects</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          Theme & Branding
                        </h3>
                        <p className="text-xs text-muted-foreground -mt-2">Choose a theme preset and set your brand assets. You can still customize colors, fonts, and layout below.</p>
                        <div className="space-y-3">
                          <Label data-testid="label-site-type">Theme Preset</Label>
                          <p className="text-xs text-muted-foreground mb-3">Themes apply layout and typography defaults. Pick one that matches your content style.</p>
                          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                            {[
                              { value: "blog", label: "Blog", desc: "Editorial, serif fonts, spacious" },
                              { value: "news", label: "News", desc: "Compact, condensed, information-dense" },
                              { value: "forbis", label: "Forbis", desc: "Forbes-style 3-column, business publication" },
                              { value: "magazine", label: "Magazine", desc: "Multi-column grid, TIME-style" },
                              { value: "novapress", label: "NovaPress", desc: "Modern editorial, grid-based, premium magazine" },
                              { value: "portfolio", label: "Portfolio", desc: "Large images, minimal text" },
                              { value: "restaurant", label: "Restaurant", desc: "Food & dining news, warm colors" },
                              { value: "crypto", label: "Crypto", desc: "Data-heavy, tech aesthetic" },
                              { value: "aurora", label: "Aurora", desc: "Dreamy pastel gradients, soft shadows" },
                              { value: "carbon", label: "Carbon", desc: "Bold brutalist, dark mode, sharp edges" },
                              { value: "soho", label: "Soho", desc: "Sophisticated serif, editorial elegance" },
                              { value: "citrine", label: "Citrine", desc: "Warm golden accents, magazine style" },
                              { value: "verve", label: "Verve", desc: "Vibrant creative, high-energy gradients" },
                              { value: "minimal", label: "Minimal", desc: "Ultra-clean, maximum whitespace" },
                              { value: "ocean", label: "Ocean", desc: "Calming blue tones, serene vibes" },
                              { value: "forest", label: "Forest", desc: "Natural green palette, organic feel" },
                            ].map((theme) => (
                              <Card
                                key={theme.value}
                                className={`cursor-pointer transition-all ${siteData.siteType === theme.value
                                  ? "ring-2 ring-primary"
                                  : "hover-elevate"
                                  }`}
                                onClick={() => setSiteData({ ...siteData, siteType: theme.value })}
                                data-testid={`card-theme-${theme.value}`}
                              >
                                <CardContent className="p-4">
                                  <div className="aspect-video bg-muted rounded mb-3 flex items-center justify-center">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-muted-foreground">{theme.label.substring(0, 1)}</div>
                                    </div>
                                  </div>
                                  <h4 className="font-semibold text-sm mb-1" data-testid={`text-theme-name-${theme.value}`}>{theme.label}</h4>
                                  <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-theme-desc-${theme.value}`}>{theme.desc}</p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">Switching themes does not change your content or URLs.</p>
                        </div>
  
                        <div className="space-y-4 pt-4 border-t">
                          <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            Brand Assets
                          </div>
                          <p className="text-xs text-muted-foreground">Upload a logo and favicon for consistent branding. Transparent PNG or SVG works best.</p>
                          <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="logoUrl" data-testid="label-logo">Logo URL</Label>
                              <Input
                                id="logoUrl"
                                data-testid="input-logo"
                                placeholder="https://example.com/logo.png"
                                value={siteData.logoUrl}
                                onChange={(e) => setSiteData({ ...siteData, logoUrl: e.target.value })}
                              />
                              <p className="text-xs text-muted-foreground">PNG or SVG recommended. Ideal size: 200x60 pixels.</p>
                            </div>
  
                            <div className="space-y-2">
                              <Label htmlFor="favicon" data-testid="label-favicon">Favicon URL</Label>
                              <Input
                                id="favicon"
                                data-testid="input-favicon"
                                placeholder="https://example.com/favicon.ico"
                                value={siteData.favicon}
                                onChange={(e) => setSiteData({ ...siteData, favicon: e.target.value })}
                              />
                              <p className="text-xs text-muted-foreground" data-testid="text-favicon-hint">Use a square image, 32x32 or 64x64 pixels.</p>
                            </div>
                          </div>
  
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="flex items-center justify-between space-x-4">
                              <div className="space-y-0.5">
                                <Label htmlFor="hideLogoText" data-testid="label-hide-logo-text">Hide Logo Text</Label>
                                <p className="text-xs text-muted-foreground">Only show the logo image in the header (hide the site title).</p>
                              </div>
                              <Switch
                                id="hideLogoText"
                                checked={templateSettings.hideLogoText}
                                onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, hideLogoText: checked })}
                                data-testid="switch-hide-logo-text"
                              />
                            </div>
  
                            <div className="flex items-center justify-between space-x-4">
                              <div className="space-y-0.5">
                                <Label htmlFor="headerLogoInvertColors" data-testid="label-header-logo-invert">Invert Header Logo</Label>
                                <p className="text-xs text-muted-foreground">Flip logo colors for dark header backgrounds.</p>
                              </div>
                              <Switch
                                id="headerLogoInvertColors"
                                checked={templateSettings.headerLogoInvertColors}
                                onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, headerLogoInvertColors: checked })}
                                data-testid="switch-header-logo-invert"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
  
                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          Colors & Accents
                        </h3>
                        <p className="text-xs text-muted-foreground -mt-2">Define your site's color palette. These colors are used throughout your public pages for branding consistency.</p>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <div className="space-y-2">
                            <Label htmlFor="primaryColor" className="flex items-center gap-2" data-testid="label-primary-color">
                              <span className="w-3 h-3 rounded-sm border" style={{ backgroundColor: templateSettings.primaryColor }} />
                              Primary Color
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id="primaryColor"
                                type="color"
                                value={templateSettings.primaryColor}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, primaryColor: e.target.value })}
                                className="w-12 h-9 p-1 cursor-pointer"
                                data-testid="input-primary-color"
                              />
                              <Input
                                value={templateSettings.primaryColor}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, primaryColor: e.target.value })}
                                className="flex-1 font-mono text-sm"
                                data-testid="input-primary-color-hex"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">Used for links, buttons, and highlights throughout your site</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="secondaryColor" className="flex items-center gap-2" data-testid="label-secondary-color">
                              <span className="w-3 h-3 rounded-sm border" style={{ backgroundColor: templateSettings.secondaryColor }} />
                              Secondary Color
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id="secondaryColor"
                                type="color"
                                value={templateSettings.secondaryColor}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, secondaryColor: e.target.value })}
                                className="w-12 h-9 p-1 cursor-pointer"
                                data-testid="input-secondary-color"
                              />
                              <Input
                                value={templateSettings.secondaryColor}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, secondaryColor: e.target.value })}
                                className="flex-1 font-mono text-sm"
                                data-testid="input-secondary-color-hex"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">Accent color for secondary elements and hover states</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="backgroundColor" className="flex items-center gap-2" data-testid="label-background-color">
                              <span className="w-3 h-3 rounded-sm border" style={{ backgroundColor: templateSettings.backgroundColor }} />
                              Background Color
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id="backgroundColor"
                                type="color"
                                value={templateSettings.backgroundColor}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, backgroundColor: e.target.value })}
                                className="w-12 h-9 p-1 cursor-pointer"
                                data-testid="input-background-color"
                              />
                              <Input
                                value={templateSettings.backgroundColor}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, backgroundColor: e.target.value })}
                                className="flex-1 font-mono text-sm"
                                data-testid="input-background-color-hex"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">Main background color for your site's pages</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="textColor" className="flex items-center gap-2" data-testid="label-text-color">
                              <span className="w-3 h-3 rounded-sm border" style={{ backgroundColor: templateSettings.textColor }} />
                              Text Color
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id="textColor"
                                type="color"
                                value={templateSettings.textColor}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, textColor: e.target.value })}
                                className="w-12 h-9 p-1 cursor-pointer"
                                data-testid="input-text-color"
                              />
                              <Input
                                value={templateSettings.textColor}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, textColor: e.target.value })}
                                className="flex-1 font-mono text-sm"
                                data-testid="input-text-color-hex"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">Default color for body text and headings</p>
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 pt-4">
                          <div className="space-y-2">
                            <Label htmlFor="headerBackgroundColor" data-testid="label-header-bg-color">Header Background (optional)</Label>
                            <div className="flex gap-2">
                              <Input
                                id="headerBackgroundColor"
                                type="color"
                                value={templateSettings.headerBackgroundColor || "#ffffff"}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, headerBackgroundColor: e.target.value })}
                                className="w-12 h-9 p-1 cursor-pointer"
                                data-testid="input-header-bg-color"
                              />
                              <Input
                                value={templateSettings.headerBackgroundColor || ""}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, headerBackgroundColor: e.target.value })}
                                placeholder="Leave empty for default"
                                className="flex-1 font-mono text-sm"
                                data-testid="input-header-bg-color-hex"
                              />
                              {templateSettings.headerBackgroundColor && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setTemplateSettings({ ...templateSettings, headerBackgroundColor: "" })}
                                  data-testid="button-reset-header-bg-color"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">Custom header background color</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="headerTextColor" data-testid="label-header-text-color">Header Text Color (optional)</Label>
                            <div className="flex gap-2">
                              <Input
                                id="headerTextColor"
                                type="color"
                                value={templateSettings.headerTextColor || "#1f2937"}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, headerTextColor: e.target.value })}
                                className="w-12 h-9 p-1 cursor-pointer"
                                data-testid="input-header-text-color"
                              />
                              <Input
                                value={templateSettings.headerTextColor || ""}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, headerTextColor: e.target.value })}
                                placeholder="Leave empty for default"
                                className="flex-1 font-mono text-sm"
                                data-testid="input-header-text-color-hex"
                              />
                              {templateSettings.headerTextColor && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setTemplateSettings({ ...templateSettings, headerTextColor: "" })}
                                  data-testid="button-reset-header-text-color"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">Custom header text/menu color</p>
                          </div>
                        </div>
                      </div>
  
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                          <Type className="h-4 w-4" />
                          Typography
                        </h3>
                        <p className="text-xs text-muted-foreground -mt-2">Choose fonts that reflect your brand personality. These fonts are used across all your public pages.</p>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor="headingFont" data-testid="label-heading-font">Heading Font</Label>
                            <Select
                              value={templateSettings.headingFont}
                              onValueChange={(value: "modern" | "classic" | "editorial" | "tech" | "elegant" | "system") =>
                                setTemplateSettings({ ...templateSettings, headingFont: value })
                              }
                            >
                              <SelectTrigger id="headingFont" data-testid="select-heading-font">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="modern">Modern (Inter)</SelectItem>
                                <SelectItem value="classic">Classic (Georgia)</SelectItem>
                                <SelectItem value="editorial">Editorial (Merriweather)</SelectItem>
                                <SelectItem value="tech">Tech (JetBrains Mono)</SelectItem>
                                <SelectItem value="elegant">Elegant (Playfair Display)</SelectItem>
                                <SelectItem value="system">System (Native UI)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">The font used for titles and section headers</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="bodyFont" data-testid="label-body-font">Body Font</Label>
                            <Select
                              value={templateSettings.bodyFont}
                              onValueChange={(value: "modern" | "classic" | "editorial" | "tech" | "elegant" | "system") =>
                                setTemplateSettings({ ...templateSettings, bodyFont: value })
                              }
                            >
                              <SelectTrigger id="bodyFont" data-testid="select-body-font">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="modern">Modern (Inter)</SelectItem>
                                <SelectItem value="classic">Classic (Georgia)</SelectItem>
                                <SelectItem value="editorial">Editorial (Source Serif)</SelectItem>
                                <SelectItem value="tech">Tech (IBM Plex Sans)</SelectItem>
                                <SelectItem value="elegant">Elegant (Lora)</SelectItem>
                                <SelectItem value="system">System (Native UI)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">The primary font for your site's content and paragraphs</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="fontScale" data-testid="label-font-scale">Font Size Scale</Label>
                            <Select
                              value={templateSettings.fontScale}
                              onValueChange={(value: "compact" | "normal" | "spacious") =>
                                setTemplateSettings({ ...templateSettings, fontScale: value })
                              }
                            >
                              <SelectTrigger id="fontScale" data-testid="select-font-scale">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="compact">Compact</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="spacious">Spacious</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Controls overall text size throughout the site</p>
                          </div>
                        </div>
                      </div>
  
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                          <Layout className="h-4 w-4" />
                          Layout & Spacing
                        </h3>
                        <p className="text-xs text-muted-foreground -mt-2">Control how content is arranged and spaced on your pages for optimal readability.</p>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <div className="space-y-2">
                            <Label htmlFor="logoSize" data-testid="label-logo-size">Logo Size</Label>
                            <Select
                              value={templateSettings.logoSize}
                              onValueChange={(value: "small" | "medium" | "large" | "custom") =>
                                setTemplateSettings({ ...templateSettings, logoSize: value })
                              }
                            >
                              <SelectTrigger id="logoSize" data-testid="select-logo-size">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="small">Small (32px)</SelectItem>
                                <SelectItem value="medium">Medium (48px)</SelectItem>
                                <SelectItem value="large">Large (56px)</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                            {templateSettings.logoSize === "custom" && (
                              <div className="flex items-center gap-2 mt-2">
                                <Input
                                  type="number"
                                  min={20}
                                  max={200}
                                  value={templateSettings.logoSizeCustom || 48}
                                  onChange={(e) => setTemplateSettings({
                                    ...templateSettings,
                                    logoSizeCustom: parseInt(e.target.value) || 48
                                  })}
                                  className="w-20"
                                  data-testid="input-logo-size-custom"
                                />
                                <span className="text-sm text-muted-foreground">px</span>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">Adjust the size of your logo in the header</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="headerStyle" data-testid="label-header-style">Header Style</Label>
                            <Select
                              value={templateSettings.headerStyle}
                              onValueChange={(value: "minimal" | "standard" | "full") =>
                                setTemplateSettings({ ...templateSettings, headerStyle: value })
                              }
                            >
                              <SelectTrigger id="headerStyle" data-testid="select-header-style">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="minimal">Minimal</SelectItem>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="full">Full</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cardStyle" data-testid="label-card-style">Card Style</Label>
                            <Select
                              value={templateSettings.cardStyle}
                              onValueChange={(value: "rounded" | "sharp" | "borderless") =>
                                setTemplateSettings({ ...templateSettings, cardStyle: value })
                              }
                            >
                              <SelectTrigger id="cardStyle" data-testid="select-card-style">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="rounded">Rounded</SelectItem>
                                <SelectItem value="sharp">Sharp</SelectItem>
                                <SelectItem value="borderless">Borderless</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contentWidth" data-testid="label-content-width">Content Width</Label>
                            <Select
                              value={templateSettings.contentWidth}
                              onValueChange={(value: "narrow" | "medium" | "wide") =>
                                setTemplateSettings({ ...templateSettings, contentWidth: value })
                              }
                            >
                              <SelectTrigger id="contentWidth" data-testid="select-content-width">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="narrow">Narrow (768px)</SelectItem>
                                <SelectItem value="medium">Medium (1024px)</SelectItem>
                                <SelectItem value="wide">Wide (1280px)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Controls how wide the content area appears. Narrower is better for readability.</p>
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3 pt-4">
                          <div className="flex items-center justify-between space-x-2 bg-muted/50 p-3 rounded-lg">
                            <Label htmlFor="showFeaturedHero" className="cursor-pointer" data-testid="label-show-hero">Show Featured Hero</Label>
                            <Switch
                              id="showFeaturedHero"
                              checked={templateSettings.showFeaturedHero}
                              onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, showFeaturedHero: checked })}
                              data-testid="switch-show-hero"
                            />
                          </div>
                          <div className="flex items-center justify-between space-x-2 bg-muted/50 p-3 rounded-lg">
                            <Label htmlFor="showSearch" className="cursor-pointer" data-testid="label-show-search">Show Search</Label>
                            <Switch
                              id="showSearch"
                              checked={templateSettings.showSearch}
                              onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, showSearch: checked })}
                              data-testid="switch-show-search"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="maxNavItems" data-testid="label-max-nav">Max Nav Items: {templateSettings.maxNavItems}</Label>
                            <Slider
                              id="maxNavItems"
                              min={3}
                              max={10}
                              step={1}
                              value={[templateSettings.maxNavItems]}
                              onValueChange={([value]) => setTemplateSettings({ ...templateSettings, maxNavItems: value })}
                              className="py-2"
                              data-testid="slider-max-nav"
                            />
                          </div>
                        </div>
                        <div className="pt-4 grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="menuActiveStyle" data-testid="label-menu-style">Menu Selected Style</Label>
                            <Select
                              value={templateSettings.menuActiveStyle || "underline"}
                              onValueChange={(value: "underline" | "background" | "pill" | "bold") => setTemplateSettings({ ...templateSettings, menuActiveStyle: value })}
                            >
                              <SelectTrigger id="menuActiveStyle" data-testid="select-menu-style">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="underline">Underline (thick line below)</SelectItem>
                                <SelectItem value="background">Background Highlight</SelectItem>
                                <SelectItem value="pill">Pill (filled rounded)</SelectItem>
                                <SelectItem value="bold">Bold Text</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Choose how selected menu items appear</p>
                          </div>
  
                          <div className="space-y-2">
                            <Label htmlFor="menuSpacing" data-testid="label-menu-spacing">Menu Spacing</Label>
                            <Select
                              value={templateSettings.menuSpacing || "normal"}
                              onValueChange={(value: "compact" | "normal" | "relaxed" | "spacious") => setTemplateSettings({ ...templateSettings, menuSpacing: value })}
                            >
                              <SelectTrigger id="menuSpacing" data-testid="select-menu-spacing">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="compact">Compact</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="relaxed">Relaxed</SelectItem>
                                <SelectItem value="spacious">Spacious</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Adjust spacing between menu items</p>
                          </div>
                        </div>
  
                        <div className="flex items-center justify-between space-x-2 bg-muted/50 p-3 rounded-lg">
                          <div>
                            <Label htmlFor="showMenuIcons" className="cursor-pointer" data-testid="label-show-menu-icons">Show Menu Icons</Label>
                            <p className="text-xs text-muted-foreground">Display home icon in navigation menu</p>
                          </div>
                          <Switch
                            id="showMenuIcons"
                            checked={templateSettings.showMenuIcons !== false}
                            onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, showMenuIcons: checked })}
                            data-testid="switch-show-menu-icons"
                          />
                        </div>
                      </div>
  
                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Visual Effects
                        </h3>
                        <p className="text-xs text-muted-foreground -mt-2">Add visual flair with custom cursors and card styles to enhance user experience.</p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="postCardStyle" data-testid="label-post-card-style">Post Card Design</Label>
                            <Select
                              value={templateSettings.postCardStyle || "standard"}
                              onValueChange={(value: "standard" | "editorial" | "minimal" | "overlay" | "compact" | "featured" | "glass" | "gradient") => setTemplateSettings({ ...templateSettings, postCardStyle: value })}
                            >
                              <SelectTrigger id="postCardStyle" data-testid="select-post-card-style">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="standard">Standard (classic grid cards)</SelectItem>
                                <SelectItem value="editorial">Editorial (split magazine style)</SelectItem>
                                <SelectItem value="minimal">Minimal (list with thumbnails)</SelectItem>
                                <SelectItem value="compact">Compact (small thumbnail list)</SelectItem>
                                <SelectItem value="featured">Featured (wide hero-style cards)</SelectItem>
                                <SelectItem value="glass">Glass (frosted glassmorphism effect)</SelectItem>
                                <SelectItem value="gradient">Gradient (bold gradient backgrounds)</SelectItem>
                                <SelectItem value="overlay">Overlay (text over image)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">How article previews appear on listing pages</p>
                          </div>
  
                          <div className="space-y-2">
                            <Label htmlFor="cursorStyle" data-testid="label-cursor-style">Custom Cursor</Label>
                            <Select
                              value={templateSettings.cursorStyle || "default"}
                              onValueChange={(value: "default" | "pointer-dot" | "crosshair" | "spotlight" | "trail") => setTemplateSettings({ ...templateSettings, cursorStyle: value })}
                            >
                              <SelectTrigger id="cursorStyle" data-testid="select-cursor-style">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">Default (browser cursor)</SelectItem>
                                <SelectItem value="pointer-dot">Pointer Dot (animated dot)</SelectItem>
                                <SelectItem value="crosshair">Crosshair (precision style)</SelectItem>
                                <SelectItem value="spotlight">Spotlight (glow effect)</SelectItem>
                                <SelectItem value="trail">Trail (following particles)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Add animated cursor effects to your site</p>
                          </div>
                        </div>
  
                        <div className="space-y-2 pt-4">
                          <Label htmlFor="postsPerPage" data-testid="label-posts-per-page">Posts Per Page: {templateSettings.postsPerPage || 12}</Label>
                          <Slider
                            id="postsPerPage"
                            min={6}
                            max={30}
                            step={3}
                            value={[templateSettings.postsPerPage || 12]}
                            onValueChange={([value]) => setTemplateSettings({ ...templateSettings, postsPerPage: value })}
                            className="py-2"
                            data-testid="slider-posts-per-page"
                          />
                          <p className="text-xs text-muted-foreground">Number of posts to show per page before pagination</p>
                        </div>
                      </div>
  
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Globe className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-semibold">Footer & Social Links</h3>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="footerColorMode" data-testid="label-footer-color-mode">Footer Color Mode</Label>
                            <Select
                              value={templateSettings.footerColorMode || "custom"}
                              onValueChange={(value: "custom" | "primary" | "secondary" | "dark" | "light") => setTemplateSettings({ ...templateSettings, footerColorMode: value })}
                            >
                              <SelectTrigger id="footerColorMode" data-testid="select-footer-color-mode">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="custom">Custom Colors (use colors below)</SelectItem>
                                <SelectItem value="primary">Match Theme Primary</SelectItem>
                                <SelectItem value="secondary">Match Theme Secondary</SelectItem>
                                <SelectItem value="dark">Dark (slate/charcoal)</SelectItem>
                                <SelectItem value="light">Light (white/gray)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Choose how footer colors are determined</p>
                          </div>
  
                          {templateSettings.footerColorMode === "custom" && (
                            <div className="space-y-4 p-4 border border-border/50 rounded-lg bg-muted/30">
                              <h4 className="text-sm font-medium text-muted-foreground">Custom Footer Colors</h4>
                              <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                  <Label htmlFor="footerBackgroundColor" data-testid="label-footer-bg-color">Background Color</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      id="footerBackgroundColor"
                                      type="color"
                                      value={templateSettings.footerBackgroundColor || "#1f2937"}
                                      onChange={(e) => setTemplateSettings({ ...templateSettings, footerBackgroundColor: e.target.value })}
                                      className="w-12 h-9 p-1 cursor-pointer"
                                      data-testid="input-footer-bg-color"
                                    />
                                    <Input
                                      value={templateSettings.footerBackgroundColor || "#1f2937"}
                                      onChange={(e) => setTemplateSettings({ ...templateSettings, footerBackgroundColor: e.target.value })}
                                      className="flex-1 font-mono text-sm"
                                      data-testid="input-footer-bg-hex"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="footerTextColor" data-testid="label-footer-text-color">Text Color</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      id="footerTextColor"
                                      type="color"
                                      value={templateSettings.footerTextColor || "#9ca3af"}
                                      onChange={(e) => setTemplateSettings({ ...templateSettings, footerTextColor: e.target.value })}
                                      className="w-12 h-9 p-1 cursor-pointer"
                                      data-testid="input-footer-text-color"
                                    />
                                    <Input
                                      value={templateSettings.footerTextColor || "#9ca3af"}
                                      onChange={(e) => setTemplateSettings({ ...templateSettings, footerTextColor: e.target.value })}
                                      className="flex-1 font-mono text-sm"
                                      data-testid="input-footer-text-hex"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="footerLinkColor" data-testid="label-footer-link-color">Link Color</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      id="footerLinkColor"
                                      type="color"
                                      value={templateSettings.footerLinkColor || "#ffffff"}
                                      onChange={(e) => setTemplateSettings({ ...templateSettings, footerLinkColor: e.target.value })}
                                      className="w-12 h-9 p-1 cursor-pointer"
                                      data-testid="input-footer-link-color"
                                    />
                                    <Input
                                      value={templateSettings.footerLinkColor || "#ffffff"}
                                      onChange={(e) => setTemplateSettings({ ...templateSettings, footerLinkColor: e.target.value })}
                                      className="flex-1 font-mono text-sm"
                                      data-testid="input-footer-link-hex"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
  
                          <div className="space-y-2">
                            <Label htmlFor="footerText" data-testid="label-footer-text">Footer Text</Label>
                            <Input
                              id="footerText"
                              placeholder="© 2025 Your Company. All rights reserved."
                              value={templateSettings.footerText}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, footerText: e.target.value })}
                              data-testid="input-footer-text"
                            />
                          </div>
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-2">
                              <Label htmlFor="socialTwitter" data-testid="label-twitter">Twitter / X URL</Label>
                              <Input
                                id="socialTwitter"
                                placeholder="https://twitter.com/yourhandle"
                                value={templateSettings.socialTwitter}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, socialTwitter: e.target.value })}
                                data-testid="input-twitter"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="socialFacebook" data-testid="label-facebook">Facebook URL</Label>
                              <Input
                                id="socialFacebook"
                                placeholder="https://facebook.com/yourpage"
                                value={templateSettings.socialFacebook}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, socialFacebook: e.target.value })}
                                data-testid="input-facebook"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="socialInstagram" data-testid="label-instagram">Instagram URL</Label>
                              <Input
                                id="socialInstagram"
                                placeholder="https://instagram.com/yourhandle"
                                value={templateSettings.socialInstagram}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, socialInstagram: e.target.value })}
                                data-testid="input-instagram"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="socialLinkedin" data-testid="label-linkedin">LinkedIn URL</Label>
                              <Input
                                id="socialLinkedin"
                                placeholder="https://linkedin.com/company/yourcompany"
                                value={templateSettings.socialLinkedin}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, socialLinkedin: e.target.value })}
                                data-testid="input-linkedin"
                              />
                            </div>
                          </div>
  
                          <div className="pt-4 border-t space-y-4">
                            <h4 className="text-sm font-medium text-muted-foreground">Footer Logo Options</h4>
                            <div className="space-y-2">
                              <Label htmlFor="footerLogoUrl" data-testid="label-footer-logo-url">Custom Footer Logo URL</Label>
                              <Input
                                id="footerLogoUrl"
                                placeholder="Leave empty to use site logo"
                                value={templateSettings.footerLogoUrl || ""}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, footerLogoUrl: e.target.value })}
                                data-testid="input-footer-logo-url"
                              />
                              <p className="text-xs text-muted-foreground">Use a different logo in the footer (e.g., white version for dark backgrounds)</p>
                            </div>
                            <div className="flex items-center justify-between space-x-2 bg-muted/50 p-3 rounded-lg">
                              <div>
                                <Label htmlFor="footerLogoInvertColors" className="cursor-pointer" data-testid="label-footer-logo-invert">Invert Logo Colors</Label>
                                <p className="text-xs text-muted-foreground">Flip logo colors for better visibility on dark footer backgrounds</p>
                              </div>
                              <Switch
                                id="footerLogoInvertColors"
                                checked={templateSettings.footerLogoInvertColors || false}
                                onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, footerLogoInvertColors: checked })}
                                data-testid="switch-footer-logo-invert"
                              />
                            </div>
                            <div className="flex items-center justify-between space-x-2 bg-muted/50 p-3 rounded-lg">
                              <div>
                                <Label htmlFor="footerHideSiteName" className="cursor-pointer" data-testid="label-footer-hide-site-name">Hide Site Name</Label>
                                <p className="text-xs text-muted-foreground">Hide the site name text in footer (useful when logo is sufficient)</p>
                              </div>
                              <Switch
                                id="footerHideSiteName"
                                checked={templateSettings.footerHideSiteName || false}
                                onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, footerHideSiteName: checked })}
                                data-testid="switch-footer-hide-site-name"
                              />
                            </div>
                            <div className="flex items-center justify-between space-x-2 bg-muted/50 p-3 rounded-lg">
                              <div>
                                <Label htmlFor="footerShowPoweredBy" className="cursor-pointer" data-testid="label-footer-powered-by">Show "Powered by Blog Autopilot"</Label>
                                <p className="text-xs text-muted-foreground">Display attribution text in the footer</p>
                              </div>
                              <Switch
                                id="footerShowPoweredBy"
                                checked={templateSettings.footerShowPoweredBy !== false}
                                onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, footerShowPoweredBy: checked })}
                                data-testid="switch-footer-powered-by"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
  
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Settings className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-semibold">Top Announcement Banner</h3>
                        </div>
                        <div className="flex items-center justify-between space-x-2 bg-muted/50 p-3 rounded-lg">
                          <div>
                            <Label htmlFor="topBannerEnabled" className="cursor-pointer" data-testid="label-top-banner-enabled">Enable Top Banner</Label>
                            <p className="text-xs text-muted-foreground">Display an announcement banner at the top of your site</p>
                          </div>
                          <Switch
                            id="topBannerEnabled"
                            checked={templateSettings.topBannerEnabled || false}
                            onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, topBannerEnabled: checked })}
                            data-testid="switch-top-banner-enabled"
                          />
                        </div>
                        {templateSettings.topBannerEnabled && (
                          <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                            <div className="space-y-2">
                              <Label htmlFor="topBannerMessage" data-testid="label-top-banner-message">Banner Message</Label>
                              <Input
                                id="topBannerMessage"
                                placeholder="🎉 Check out our latest updates!"
                                value={templateSettings.topBannerMessage || ""}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, topBannerMessage: e.target.value })}
                                data-testid="input-top-banner-message"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="topBannerLink" data-testid="label-top-banner-link">Banner Link (optional)</Label>
                              <Input
                                id="topBannerLink"
                                placeholder="https://example.com/promo"
                                value={templateSettings.topBannerLink || ""}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, topBannerLink: e.target.value })}
                                data-testid="input-top-banner-link"
                              />
                              <p className="text-xs text-muted-foreground">Makes the banner clickable</p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor="topBannerBackgroundColor" data-testid="label-top-banner-bg">Background Color</Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="topBannerBackgroundColor"
                                    type="color"
                                    value={templateSettings.topBannerBackgroundColor || "#3b82f6"}
                                    onChange={(e) => setTemplateSettings({ ...templateSettings, topBannerBackgroundColor: e.target.value })}
                                    className="w-12 h-9 p-1 cursor-pointer"
                                    data-testid="input-top-banner-bg-color"
                                  />
                                  <Input
                                    value={templateSettings.topBannerBackgroundColor || "#3b82f6"}
                                    onChange={(e) => setTemplateSettings({ ...templateSettings, topBannerBackgroundColor: e.target.value })}
                                    className="flex-1 font-mono text-sm"
                                    data-testid="input-top-banner-bg-hex"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="topBannerTextColor" data-testid="label-top-banner-text">Text Color</Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="topBannerTextColor"
                                    type="color"
                                    value={templateSettings.topBannerTextColor || "#ffffff"}
                                    onChange={(e) => setTemplateSettings({ ...templateSettings, topBannerTextColor: e.target.value })}
                                    className="w-12 h-9 p-1 cursor-pointer"
                                    data-testid="input-top-banner-text-color"
                                  />
                                  <Input
                                    value={templateSettings.topBannerTextColor || "#ffffff"}
                                    onChange={(e) => setTemplateSettings({ ...templateSettings, topBannerTextColor: e.target.value })}
                                    className="flex-1 font-mono text-sm"
                                    data-testid="input-top-banner-text-hex"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between space-x-2 bg-muted/30 p-3 rounded-lg">
                              <Label htmlFor="topBannerDismissible" className="cursor-pointer" data-testid="label-top-banner-dismissible">Allow visitors to dismiss</Label>
                              <Switch
                                id="topBannerDismissible"
                                checked={templateSettings.topBannerDismissible !== false}
                                onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, topBannerDismissible: checked })}
                                data-testid="switch-top-banner-dismissible"
                              />
                            </div>
                          </div>
                        )}
                      </div>
  
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Settings className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-semibold">GDPR Cookie Consent</h3>
                        </div>
                        <div className="flex items-center justify-between space-x-2 bg-muted/50 p-3 rounded-lg">
                          <div>
                            <Label htmlFor="gdprBannerEnabled" className="cursor-pointer" data-testid="label-gdpr-enabled">Enable GDPR Banner</Label>
                            <p className="text-xs text-muted-foreground">Show cookie consent banner for GDPR compliance (controls Google Analytics)</p>
                          </div>
                          <Switch
                            id="gdprBannerEnabled"
                            checked={templateSettings.gdprBannerEnabled || false}
                            onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, gdprBannerEnabled: checked })}
                            data-testid="switch-gdpr-enabled"
                          />
                        </div>
                        {templateSettings.gdprBannerEnabled && (
                          <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                            <div className="space-y-2">
                              <Label htmlFor="gdprBannerMessage" data-testid="label-gdpr-message">Consent Message</Label>
                              <Textarea
                                id="gdprBannerMessage"
                                placeholder="We use cookies to improve your experience..."
                                value={templateSettings.gdprBannerMessage || ""}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, gdprBannerMessage: e.target.value })}
                                rows={2}
                                data-testid="input-gdpr-message"
                              />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor="gdprBannerButtonText" data-testid="label-gdpr-accept">Accept Button Text</Label>
                                <Input
                                  id="gdprBannerButtonText"
                                  placeholder="Accept"
                                  value={templateSettings.gdprBannerButtonText || "Accept"}
                                  onChange={(e) => setTemplateSettings({ ...templateSettings, gdprBannerButtonText: e.target.value })}
                                  data-testid="input-gdpr-accept"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="gdprBannerDeclineText" data-testid="label-gdpr-decline">Decline Button Text</Label>
                                <Input
                                  id="gdprBannerDeclineText"
                                  placeholder="Decline"
                                  value={templateSettings.gdprBannerDeclineText || "Decline"}
                                  onChange={(e) => setTemplateSettings({ ...templateSettings, gdprBannerDeclineText: e.target.value })}
                                  data-testid="input-gdpr-decline"
                                />
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor="gdprBannerBackgroundColor" data-testid="label-gdpr-bg">Background Color</Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="gdprBannerBackgroundColor"
                                    type="color"
                                    value={templateSettings.gdprBannerBackgroundColor || "#1f2937"}
                                    onChange={(e) => setTemplateSettings({ ...templateSettings, gdprBannerBackgroundColor: e.target.value })}
                                    className="w-12 h-9 p-1 cursor-pointer"
                                    data-testid="input-gdpr-bg-color"
                                  />
                                  <Input
                                    value={templateSettings.gdprBannerBackgroundColor || "#1f2937"}
                                    onChange={(e) => setTemplateSettings({ ...templateSettings, gdprBannerBackgroundColor: e.target.value })}
                                    className="flex-1 font-mono text-sm"
                                    data-testid="input-gdpr-bg-hex"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="gdprBannerTextColor" data-testid="label-gdpr-text">Text Color</Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="gdprBannerTextColor"
                                    type="color"
                                    value={templateSettings.gdprBannerTextColor || "#ffffff"}
                                    onChange={(e) => setTemplateSettings({ ...templateSettings, gdprBannerTextColor: e.target.value })}
                                    className="w-12 h-9 p-1 cursor-pointer"
                                    data-testid="input-gdpr-text-color"
                                  />
                                  <Input
                                    value={templateSettings.gdprBannerTextColor || "#ffffff"}
                                    onChange={(e) => setTemplateSettings({ ...templateSettings, gdprBannerTextColor: e.target.value })}
                                    className="flex-1 font-mono text-sm"
                                    data-testid="input-gdpr-text-hex"
                                  />
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                              When enabled, Google Analytics will only load after visitors accept cookies. Make sure to add your Analytics ID in the SEO tab.
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
                </div>
  );
}
