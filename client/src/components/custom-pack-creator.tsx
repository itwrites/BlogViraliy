import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Trash2, 
  ArrowRight,
  Link2,
  Percent,
  Settings2
} from "lucide-react";
import { 
  ARTICLE_ROLES, 
  anchorPatternDescriptions,
  type CustomPackConfig, 
  type LinkingRule, 
  type AnchorPattern 
} from "@shared/pack-definitions";
import type { ArticleRole } from "@shared/schema";
import { articleRoleDisplayNames } from "@shared/schema";

interface CustomPackCreatorProps {
  value: CustomPackConfig | null;
  onChange: (config: CustomPackConfig) => void;
}

const ANCHOR_PATTERNS: { id: AnchorPattern; label: string }[] = [
  { id: "exact", label: "Exact Phrase" },
  { id: "partial", label: "Partial Phrase" },
  { id: "semantic", label: "Related" },
  { id: "action", label: "Action" },
  { id: "list", label: "List" },
];

const defaultConfig: CustomPackConfig = {
  name: "My Custom Strategy",
  description: "A custom growth strategy tailored to your business.",
  allowedRoles: ["pillar", "support", "how_to", "general"],
  linkingRules: [
    { fromRole: "support", toRoles: ["pillar"], anchorPattern: "semantic", priority: 1 },
    { fromRole: "how_to", toRoles: ["pillar"], anchorPattern: "partial", priority: 1 },
    { fromRole: "general", toRoles: ["pillar"], anchorPattern: "semantic", priority: 2 },
  ],
  roleDistribution: [
    { role: "pillar", percentage: 5 },
    { role: "support", percentage: 50 },
    { role: "how_to", percentage: 30 },
    { role: "general", percentage: 15 },
  ],
};

export function CustomPackCreator({ value, onChange }: CustomPackCreatorProps) {
  const [config, setConfig] = useState<CustomPackConfig>(value || defaultConfig);
  const [activeTab, setActiveTab] = useState<"roles" | "rules" | "distribution">("roles");

  useEffect(() => {
    const initialConfig = value || defaultConfig;
    onChange(initialConfig);
  }, []);

  const updateConfig = (updates: Partial<CustomPackConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(newConfig);
  };

  const toggleRole = (role: ArticleRole) => {
    const newRoles = config.allowedRoles.includes(role)
      ? config.allowedRoles.filter((r) => r !== role)
      : [...config.allowedRoles, role];
    
    const newRules = config.linkingRules.filter(
      (rule) => newRoles.includes(rule.fromRole) && rule.toRoles.every((r) => newRoles.includes(r))
    );
    
    const newDistribution = config.roleDistribution.filter((d) => newRoles.includes(d.role));
    
    updateConfig({ 
      allowedRoles: newRoles, 
      linkingRules: newRules,
      roleDistribution: newDistribution 
    });
  };

  const addLinkingRule = () => {
    if (config.allowedRoles.length < 2) return;
    const newRule: LinkingRule = {
      fromRole: config.allowedRoles[1] || "support",
      toRoles: [config.allowedRoles[0] || "pillar"],
      anchorPattern: "semantic",
      priority: config.linkingRules.length + 1,
    };
    updateConfig({ linkingRules: [...config.linkingRules, newRule] });
  };

  const updateRule = (index: number, updates: Partial<LinkingRule>) => {
    const newRules = [...config.linkingRules];
    newRules[index] = { ...newRules[index], ...updates };
    updateConfig({ linkingRules: newRules });
  };

  const removeRule = (index: number) => {
    updateConfig({ linkingRules: config.linkingRules.filter((_, i) => i !== index) });
  };

  const updateDistribution = (role: ArticleRole, percentage: number) => {
    const existing = config.roleDistribution.find((d) => d.role === role);
    if (existing) {
      updateConfig({
        roleDistribution: config.roleDistribution.map((d) =>
          d.role === role ? { ...d, percentage } : d
        ),
      });
    } else {
      updateConfig({
        roleDistribution: [...config.roleDistribution, { role, percentage }],
      });
    }
  };

  const totalDistribution = config.roleDistribution.reduce((sum, d) => sum + d.percentage, 0);

  return (
    <Card className="mt-4 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Custom Strategy Builder
        </CardTitle>
        <CardDescription>
          Design your own asset types, growth logic, and output mix
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Strategy Name</Label>
            <Input
              value={config.name}
              onChange={(e) => updateConfig({ name: e.target.value })}
              placeholder="My Custom Strategy"
              data-testid="input-custom-pack-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Strategy Summary</Label>
            <Input
              value={config.description}
              onChange={(e) => updateConfig({ description: e.target.value })}
              placeholder="Describe your growth strategy..."
              data-testid="input-custom-pack-description"
            />
          </div>
        </div>

        <div className="flex gap-2 border-b">
          <Button
            variant={activeTab === "roles" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("roles")}
            data-testid="tab-roles"
          >
            Asset Types ({config.allowedRoles.length})
          </Button>
          <Button
            variant={activeTab === "rules" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("rules")}
            data-testid="tab-rules"
          >
            <Link2 className="w-3 h-3 mr-1" />
            Growth Logic ({config.linkingRules.length})
          </Button>
          <Button
            variant={activeTab === "distribution" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("distribution")}
            data-testid="tab-distribution"
          >
            <Percent className="w-3 h-3 mr-1" />
            Output Mix
          </Button>
        </div>

        {activeTab === "roles" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select which asset types to include in this strategy. Each type has a distinct structure and metadata.
            </p>
            <ScrollArea className="h-[200px] pr-4">
              <div className="grid grid-cols-2 gap-2">
                {ARTICLE_ROLES.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center space-x-2 p-2 rounded-md hover-elevate"
                  >
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={config.allowedRoles.includes(role.id)}
                      onCheckedChange={() => toggleRole(role.id)}
                      data-testid={`checkbox-role-${role.id}`}
                    />
                    <label
                      htmlFor={`role-${role.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {role.label}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              Selected asset types: {config.allowedRoles.map((r) => articleRoleDisplayNames[r]).join(", ")}
            </p>
          </div>
        )}

        {activeTab === "rules" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Define how assets connect. Growth logic shapes internal pathways and authority flow.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={addLinkingRule}
                disabled={config.allowedRoles.length < 2}
                data-testid="button-add-rule"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Logic
              </Button>
            </div>
            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-2">
                {config.linkingRules.map((rule, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
                  >
                    <Select
                      value={rule.fromRole}
                      onValueChange={(v) => updateRule(index, { fromRole: v as ArticleRole })}
                    >
                      <SelectTrigger className="w-[140px]" data-testid={`select-from-role-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {config.allowedRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {articleRoleDisplayNames[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Select
                      value={rule.toRoles[0]}
                      onValueChange={(v) => updateRule(index, { toRoles: [v as ArticleRole] })}
                    >
                      <SelectTrigger className="w-[140px]" data-testid={`select-to-role-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {config.allowedRoles
                          .filter((r) => r !== rule.fromRole)
                          .map((role) => (
                            <SelectItem key={role} value={role}>
                              {articleRoleDisplayNames[role]}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={rule.anchorPattern}
                      onValueChange={(v) => updateRule(index, { anchorPattern: v as AnchorPattern })}
                    >
                      <SelectTrigger className="w-[120px]" data-testid={`select-anchor-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ANCHOR_PATTERNS.map((pattern) => (
                          <SelectItem key={pattern.id} value={pattern.id}>
                            {pattern.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeRule(index)}
                      data-testid={`button-remove-rule-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {config.linkingRules.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No growth logic defined. Add logic to connect asset types.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {activeTab === "distribution" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Set the output mix for each asset type. Total should equal 100%.
            </p>
            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-4">
                {config.allowedRoles.map((role) => {
                  const dist = config.roleDistribution.find((d) => d.role === role);
                  const percentage = dist?.percentage || 0;
                  return (
                    <div key={role} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">{articleRoleDisplayNames[role]}</Label>
                        <span className="text-sm font-mono">{percentage}%</span>
                      </div>
                      <Slider
                        value={[percentage]}
                        onValueChange={([v]) => updateDistribution(role, v)}
                        max={100}
                        step={5}
                        data-testid={`slider-distribution-${role}`}
                      />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium">Total</span>
              <Badge variant={totalDistribution === 100 ? "default" : "destructive"}>
                {totalDistribution}%
              </Badge>
            </div>
            {totalDistribution !== 100 && (
              <p className="text-xs text-destructive">
                Output mix should total 100%. Currently at {totalDistribution}%.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
