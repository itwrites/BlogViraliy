import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Check, ChevronsUpDown, ExternalLink, GripVertical, Menu, Plus, Trash2, X } from "lucide-react";
import { languageDisplayNames } from "@shared/schema";
import type { ContentLanguage, SiteMenuItem, TemplateSettings } from "@shared/schema";
import { cardVariants } from "./variants";
import type { MenuItemDraft, SetState, SiteDataState } from "./types";

type NavigationSectionProps = {
  siteData: SiteDataState;
  setSiteData: SetState<SiteDataState>;
  templateSettings: TemplateSettings;
  setTemplateSettings: SetState<TemplateSettings>;
  menuItems: SiteMenuItem[];
  newMenuItem: MenuItemDraft;
  setNewMenuItem: SetState<MenuItemDraft>;
  addMenuItem: () => void;
  deleteMenuItem: (itemId: string) => void;
  moveMenuItem: (index: number, direction: "up" | "down") => void;
  removeTagSlugFromNewItem: (slug: string) => void;
  tagSelectorOpen: boolean;
  setTagSelectorOpen: SetState<boolean>;
  tagSearchQuery: string;
  setTagSearchQuery: SetState<string>;
  filteredTags: string[];
  canCreateNewTag: boolean;
};

export function NavigationSection({
  siteData,
  setSiteData,
  templateSettings,
  setTemplateSettings,
  menuItems,
  newMenuItem,
  setNewMenuItem,
  addMenuItem,
  deleteMenuItem,
  moveMenuItem,
  removeTagSlugFromNewItem,
  tagSelectorOpen,
  setTagSelectorOpen,
  tagSearchQuery,
  setTagSearchQuery,
  filteredTags,
  canCreateNewTag,
}: NavigationSectionProps) {
  return (
    <div className="space-y-8">
      <div className="bg-muted/50 rounded-xl p-4 border border-border">
        <div className="flex items-start gap-3">
          <Menu className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Navigation appears in your site's header</p>
            <p className="text-xs text-muted-foreground mt-1">You can let the system automatically create a menu from your content tags, or build a custom menu with your own links.</p>
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
            <CardTitle className="flex items-center gap-2 text-xl tracking-tight" data-testid="text-navigation-title">
              <Menu className="h-5 w-5" />
              Navigation Settings
            </CardTitle>
            <CardDescription data-testid="text-navigation-description">
              Configure your site's navigation menu. Choose between auto-generated menus or manually define custom links.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Menu Type</h4>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="logoTargetUrl" data-testid="label-logo-target-url">Logo Click URL</Label>
                  <Input
                    id="logoTargetUrl"
                    data-testid="input-logo-target-url"
                    placeholder="https://example.com (leave empty for homepage)"
                    value={siteData.logoTargetUrl}
                    onChange={(e) => setSiteData({ ...siteData, logoTargetUrl: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Where clicking the logo takes users. Leave empty to go to homepage.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label data-testid="label-menu-mode">Navigation Menu Mode</Label>
                  <Select
                    value={siteData.menuMode}
                    onValueChange={(value: "automatic" | "manual") => setSiteData({ ...siteData, menuMode: value })}
                  >
                    <SelectTrigger data-testid="select-menu-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic">Automatic (from tags)</SelectItem>
                      <SelectItem value="manual">Manual (custom menu)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {siteData.menuMode === "automatic"
                      ? "Automatically builds your menu from popular content tags"
                      : "Create your own menu structure with custom links and dropdowns"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label data-testid="label-post-url-format">Article URL Format</Label>
                  <Select
                    value={siteData.postUrlFormat}
                    onValueChange={(value: "with-prefix" | "root") => setSiteData({ ...siteData, postUrlFormat: value })}
                  >
                    <SelectTrigger data-testid="select-post-url-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="with-prefix">/post/slug (with prefix)</SelectItem>
                      <SelectItem value="root">/slug (root level)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {siteData.postUrlFormat === "with-prefix"
                      ? "Articles use /post/my-article format"
                      : "Articles use /my-article format (cleaner URLs)"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label data-testid="label-display-language">Display Language</Label>
                  <Select
                    value={siteData.displayLanguage}
                    onValueChange={(value: ContentLanguage) => setSiteData({ ...siteData, displayLanguage: value })}
                  >
                    <SelectTrigger data-testid="select-display-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(languageDisplayNames).map(([code, name]) => (
                        <SelectItem key={code} value={code}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Language for public site UI elements (Read More, Related Posts, etc.)
                  </p>
                </div>
              </div>
            </div>

            {siteData.menuMode === "automatic" && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Menu Settings</h4>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="autoMaxNavItems" data-testid="label-auto-max-nav">
                      Max Menu Items: {templateSettings.maxNavItems}
                    </Label>
                    <Slider
                      id="autoMaxNavItems"
                      min={3}
                      max={10}
                      step={1}
                      value={[templateSettings.maxNavItems]}
                      onValueChange={([value]) => setTemplateSettings({ ...templateSettings, maxNavItems: value })}
                      className="py-2"
                      data-testid="slider-auto-max-nav"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum number of tags to show in the navigation menu
                    </p>
                  </div>
                </div>
              </div>
            )}

            {siteData.menuMode === "manual" && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Custom Menu Items</h4>
                  <span className="text-sm text-muted-foreground">{menuItems.length} items</span>
                </div>

                {menuItems.length > 0 && (
                  <div className="space-y-2">
                    {menuItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
                        data-testid={`menu-item-${item.id}`}
                      >
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveMenuItem(index, "up")}
                            disabled={index === 0}
                            data-testid={`button-move-up-${item.id}`}
                          >
                            <GripVertical className="h-3 w-3 rotate-90" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveMenuItem(index, "down")}
                            disabled={index === menuItems.length - 1}
                            data-testid={`button-move-down-${item.id}`}
                          >
                            <GripVertical className="h-3 w-3 rotate-90" />
                          </Button>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate" data-testid={`text-menu-label-${item.id}`}>
                              {item.label}
                            </span>
                            {item.type === "url" && item.openInNewTab && (
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.type === "url" ? item.href : `Tag group: ${item.groupSlug || "not set"}`}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMenuItem(item.id)}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Add Menu Item</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="newMenuLabel">Label</Label>
                        <Input
                          id="newMenuLabel"
                          placeholder="Menu item text"
                          value={newMenuItem.label}
                          onChange={(e) => setNewMenuItem({ ...newMenuItem, label: e.target.value })}
                          data-testid="input-new-menu-label"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={newMenuItem.type}
                          onValueChange={(value: "url" | "tag_group") => setNewMenuItem({ ...newMenuItem, type: value })}
                        >
                          <SelectTrigger data-testid="select-new-menu-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="url">URL Link</SelectItem>
                            <SelectItem value="tag_group">Tag Group</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {newMenuItem.type === "url" ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="newMenuHref">URL</Label>
                          <Input
                            id="newMenuHref"
                            placeholder="/about or https://..."
                            value={newMenuItem.href}
                            onChange={(e) => setNewMenuItem({ ...newMenuItem, href: e.target.value })}
                            data-testid="input-new-menu-href"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <Switch
                            id="newMenuNewTab"
                            checked={newMenuItem.openInNewTab}
                            onCheckedChange={(checked) => setNewMenuItem({ ...newMenuItem, openInNewTab: checked })}
                            data-testid="switch-new-menu-new-tab"
                          />
                          <Label htmlFor="newMenuNewTab">Open in new tab</Label>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="newMenuGroupSlug">Group URL Slug</Label>
                            <Input
                              id="newMenuGroupSlug"
                              placeholder="tech-news"
                              value={newMenuItem.groupSlug}
                              onChange={(e) => setNewMenuItem({ ...newMenuItem, groupSlug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                              data-testid="input-new-menu-group-slug"
                            />
                            <p className="text-xs text-muted-foreground">
                              Creates page at /topics/{newMenuItem.groupSlug || "slug"}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Tags in this group</Label>
                          <Popover open={tagSelectorOpen} onOpenChange={setTagSelectorOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={tagSelectorOpen}
                                className="w-full justify-between"
                                data-testid="button-tag-selector"
                              >
                                <span className="text-muted-foreground">
                                  {newMenuItem.tagSlugs.length > 0
                                    ? `${newMenuItem.tagSlugs.length} tag(s) selected`
                                    : "Search and select tags..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command shouldFilter={false}>
                                <CommandInput
                                  placeholder="Search tags or type to create..."
                                  value={tagSearchQuery}
                                  onValueChange={setTagSearchQuery}
                                  data-testid="input-tag-search"
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    {tagSearchQuery.trim() ? (
                                      <button
                                        type="button"
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                                        onClick={() => {
                                          const normalizedTag = tagSearchQuery.toLowerCase().trim().replace(/\s+/g, "-");
                                          if (normalizedTag && !newMenuItem.tagSlugs.includes(normalizedTag)) {
                                            setNewMenuItem({ ...newMenuItem, tagSlugs: [...newMenuItem.tagSlugs, normalizedTag] });
                                            setTagSearchQuery("");
                                          }
                                          // Keep popover open for multi-select
                                          requestAnimationFrame(() => setTagSelectorOpen(true));
                                        }}
                                        data-testid="button-create-new-tag"
                                      >
                                        <Plus className="h-4 w-4" />
                                        Create "{tagSearchQuery.toLowerCase().trim().replace(/\s+/g, "-")}"
                                      </button>
                                    ) : (
                                      <span className="text-muted-foreground">No tags found. Type to create a new one.</span>
                                    )}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {filteredTags.map((tag) => {
                                      const isSelected = newMenuItem.tagSlugs.includes(tag);
                                      return (
                                        <CommandItem
                                          key={tag}
                                          value={tag}
                                          onSelect={() => {
                                            if (isSelected) {
                                              setNewMenuItem({ ...newMenuItem, tagSlugs: newMenuItem.tagSlugs.filter(t => t !== tag) });
                                            } else {
                                              setNewMenuItem({ ...newMenuItem, tagSlugs: [...newMenuItem.tagSlugs, tag] });
                                            }
                                            // Keep popover open for multi-select
                                            requestAnimationFrame(() => setTagSelectorOpen(true));
                                          }}
                                          data-testid={`option-tag-${tag}`}
                                        >
                                          <Check className={`mr-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                                          {tag}
                                        </CommandItem>
                                      );
                                    })}
                                    {canCreateNewTag && filteredTags.length > 0 && (
                                      <CommandItem
                                        value={`create-${tagSearchQuery}`}
                                        onSelect={() => {
                                          const normalizedTag = tagSearchQuery.toLowerCase().trim().replace(/\s+/g, "-");
                                          if (normalizedTag && !newMenuItem.tagSlugs.includes(normalizedTag)) {
                                            setNewMenuItem({ ...newMenuItem, tagSlugs: [...newMenuItem.tagSlugs, normalizedTag] });
                                            setTagSearchQuery("");
                                          }
                                          // Keep popover open for multi-select
                                          requestAnimationFrame(() => setTagSelectorOpen(true));
                                        }}
                                        data-testid="option-create-tag"
                                      >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create "{tagSearchQuery.toLowerCase().trim().replace(/\s+/g, "-")}"
                                      </CommandItem>
                                    )}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {newMenuItem.tagSlugs.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {newMenuItem.tagSlugs.map((slug) => (
                                <Badge
                                  key={slug}
                                  variant="secondary"
                                  className="gap-1"
                                >
                                  {slug}
                                  <button
                                    type="button"
                                    onClick={() => removeTagSlugFromNewItem(slug)}
                                    className="ml-1 hover:text-destructive"
                                    data-testid={`button-remove-tag-${slug}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <Button onClick={addMenuItem} disabled={!newMenuItem.label.trim()} data-testid="button-add-menu-item">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Menu Item
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
