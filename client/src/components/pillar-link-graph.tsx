import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, ZoomIn, ZoomOut, Move } from "lucide-react";
import type { PillarArticle, Pillar, ArticleRole, PackType } from "@shared/schema";
import { articleRoleDisplayNames } from "@shared/schema";
import { packDefinitions, type LinkingRule, type CustomPackConfig } from "@shared/pack-definitions";

interface PillarLinkGraphProps {
  pillar: Pillar;
  articles: PillarArticle[];
}

interface GraphNode {
  id: string;
  title: string;
  role: ArticleRole;
  status: string;
  x: number;
  y: number;
  radius: number;
  incomingLinks: number;
  outgoingLinks: number;
}

interface GraphEdge {
  from: string;
  to: string;
  fromRole: ArticleRole;
  toRole: ArticleRole;
  anchorPattern: string;
}

const roleColors: Record<string, string> = {
  pillar: "hsl(var(--primary))",
  support: "hsl(210, 70%, 55%)",
  long_tail: "hsl(180, 60%, 50%)",
  rankings: "hsl(280, 60%, 55%)",
  best_of: "hsl(320, 60%, 55%)",
  comparison: "hsl(35, 80%, 55%)",
  review: "hsl(25, 80%, 55%)",
  conversion: "hsl(350, 70%, 55%)",
  case_study: "hsl(160, 60%, 45%)",
  benchmark: "hsl(200, 60%, 50%)",
  framework: "hsl(260, 60%, 55%)",
  whitepaper: "hsl(240, 60%, 55%)",
  how_to: "hsl(120, 50%, 45%)",
  faq: "hsl(50, 70%, 50%)",
  listicle: "hsl(300, 50%, 55%)",
  news: "hsl(0, 60%, 50%)",
  general: "hsl(var(--muted-foreground))",
};

function truncateTitle(title: string, maxLength: number = 25): string {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength - 3) + "...";
}

export function PillarLinkGraph({ pillar, articles }: PillarLinkGraphProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const { nodes, edges, linkStats } = useMemo(() => {
    if (!articles || articles.length === 0) {
      return { nodes: [], edges: [], linkStats: { totalLinks: 0, roleConnections: {} } };
    }

    const packType = pillar.packType as PackType;
    let linkingRules: LinkingRule[] = [];
    
    if (packType === "custom" && pillar.customPackConfig) {
      const customConfig = pillar.customPackConfig as CustomPackConfig;
      linkingRules = customConfig.linkingRules || [];
    } else {
      const packDef = packDefinitions[packType];
      linkingRules = packDef?.linkingRules || [];
    }

    const articlesByRole = new Map<ArticleRole, PillarArticle[]>();
    articles.forEach((article) => {
      const role = (article.articleRole || "general") as ArticleRole;
      if (!articlesByRole.has(role)) {
        articlesByRole.set(role, []);
      }
      articlesByRole.get(role)!.push(article);
    });

    const computedEdges: GraphEdge[] = [];
    const incomingCount = new Map<string, number>();
    const outgoingCount = new Map<string, number>();

    articles.forEach((article) => {
      incomingCount.set(article.id, 0);
      outgoingCount.set(article.id, 0);
    });

    linkingRules.forEach((rule) => {
      const fromArticles = articlesByRole.get(rule.fromRole) || [];
      
      rule.toRoles.forEach((toRole) => {
        const toArticles = articlesByRole.get(toRole) || [];
        if (fromArticles.length === 0 || toArticles.length === 0) return;
        
        const sampleFrom = fromArticles[0];
        const sampleTo = toArticles.find(a => a.id !== sampleFrom.id);
        if (!sampleTo) return;
        
        computedEdges.push({
          from: sampleFrom.id,
          to: sampleTo.id,
          fromRole: rule.fromRole,
          toRole: toRole,
          anchorPattern: rule.anchorPattern,
        });
        incomingCount.set(sampleTo.id, (incomingCount.get(sampleTo.id) || 0) + 1);
        outgoingCount.set(sampleFrom.id, (outgoingCount.get(sampleFrom.id) || 0) + 1);
      });
    });

    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;

    const roleOrder: ArticleRole[] = [
      "pillar", "whitepaper", "framework",
      "case_study", "benchmark", "comparison", "review",
      "support", "how_to", "rankings", "best_of",
      "long_tail", "faq", "listicle", "conversion", "news", "general"
    ];

    const sortedRoles = Array.from(articlesByRole.keys()).sort((a, b) => {
      const aIdx = roleOrder.indexOf(a);
      const bIdx = roleOrder.indexOf(b);
      return (aIdx === -1 ? 100 : aIdx) - (bIdx === -1 ? 100 : bIdx);
    });

    const computedNodes: GraphNode[] = [];
    let currentAngle = -Math.PI / 2;

    sortedRoles.forEach((role, roleIndex) => {
      const roleArticles = articlesByRole.get(role) || [];
      const isPillarRole = role === "pillar";
      
      if (isPillarRole) {
        roleArticles.forEach((article) => {
          computedNodes.push({
            id: article.id,
            title: article.title,
            role: role,
            status: article.status,
            x: centerX,
            y: centerY,
            radius: 30,
            incomingLinks: incomingCount.get(article.id) || 0,
            outgoingLinks: outgoingCount.get(article.id) || 0,
          });
        });
      } else {
        const tierRadius = 150 + (roleIndex * 15);
        const angleStep = (2 * Math.PI) / Math.max(sortedRoles.length - 1, 1);
        const roleAngle = currentAngle + (roleIndex * angleStep);
        
        roleArticles.forEach((article, idx) => {
          const spread = roleArticles.length > 1 ? (idx - (roleArticles.length - 1) / 2) * 0.15 : 0;
          const angle = roleAngle + spread;
          const dist = tierRadius + (idx % 2) * 30;
          
          computedNodes.push({
            id: article.id,
            title: article.title,
            role: role,
            status: article.status,
            x: centerX + Math.cos(angle) * dist,
            y: centerY + Math.sin(angle) * dist,
            radius: role === "whitepaper" || role === "framework" ? 20 : 15,
            incomingLinks: incomingCount.get(article.id) || 0,
            outgoingLinks: outgoingCount.get(article.id) || 0,
          });
        });
      }
    });

    const roleConnections: Record<string, number> = {};
    computedEdges.forEach((edge) => {
      const key = `${edge.fromRole} -> ${edge.toRole}`;
      roleConnections[key] = (roleConnections[key] || 0) + 1;
    });

    return {
      nodes: computedNodes,
      edges: computedEdges,
      linkStats: {
        totalLinks: computedEdges.length,
        roleConnections,
      },
    };
  }, [articles, pillar.packType]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.2, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.2, 0.3));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (!articles || articles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Link Structure
          </CardTitle>
          <CardDescription>
            No articles to visualize. Generate the topical map first.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const highlightedEdges = hoveredNode
    ? edges.filter((e) => e.from === hoveredNode || e.to === hoveredNode)
    : [];
  const highlightedNodeIds = new Set(
    highlightedEdges.flatMap((e) => [e.from, e.to])
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2" data-testid="text-link-graph-title">
              <Network className="h-5 w-5" />
              Projected Link Structure
            </CardTitle>
            <CardDescription data-testid="text-link-graph-description">
              {nodes.length} articles with planned connections based on {packDefinitions[pillar.packType as PackType]?.name || pillar.packType} rules. Actual links are created during content generation.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={handleZoomOut} data-testid="button-zoom-out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleZoomIn} data-testid="button-zoom-in">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleReset} data-testid="button-reset-view">
              <Move className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md bg-muted/20 overflow-hidden" style={{ height: 400 }}>
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 800 500"
            className="cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            data-testid="svg-link-graph"
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {edges.map((edge, idx) => {
                const fromNode = nodeMap.get(edge.from);
                const toNode = nodeMap.get(edge.to);
                if (!fromNode || !toNode) return null;

                const isHighlighted = hoveredNode && (edge.from === hoveredNode || edge.to === hoveredNode);
                const opacity = hoveredNode ? (isHighlighted ? 0.8 : 0.1) : 0.3;

                const dx = toNode.x - fromNode.x;
                const dy = toNode.y - fromNode.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const ux = dx / dist;
                const uy = dy / dist;
                
                const startX = fromNode.x + ux * fromNode.radius;
                const startY = fromNode.y + uy * fromNode.radius;
                const endX = toNode.x - ux * toNode.radius;
                const endY = toNode.y - uy * toNode.radius;

                return (
                  <line
                    key={`edge-${idx}`}
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke={isHighlighted ? roleColors[edge.fromRole] || "hsl(var(--muted-foreground))" : "hsl(var(--muted-foreground))"}
                    strokeWidth={isHighlighted ? 2 : 1}
                    opacity={opacity}
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}

              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L6,3 z" fill="hsl(var(--muted-foreground))" opacity="0.5" />
                </marker>
              </defs>

              {nodes.map((node) => {
                const isHovered = hoveredNode === node.id;
                const isConnected = hoveredNode && highlightedNodeIds.has(node.id);
                const dimmed = hoveredNode && !isHovered && !isConnected;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    className="cursor-pointer"
                    data-testid={`node-${node.id}`}
                  >
                    <circle
                      r={node.radius}
                      fill={roleColors[node.role] || roleColors.general}
                      stroke={isHovered ? "hsl(var(--foreground))" : "transparent"}
                      strokeWidth={2}
                      opacity={dimmed ? 0.3 : 1}
                    />
                    <text
                      y={node.radius + 12}
                      textAnchor="middle"
                      fontSize={10}
                      fill="hsl(var(--foreground))"
                      opacity={dimmed ? 0.3 : 0.9}
                      className="pointer-events-none select-none"
                    >
                      {truncateTitle(node.title, 20)}
                    </text>
                    {isHovered && (
                      <g>
                        <rect
                          x={-100}
                          y={-node.radius - 50}
                          width={200}
                          height={40}
                          rx={4}
                          fill="hsl(var(--popover))"
                          stroke="hsl(var(--border))"
                        />
                        <text
                          y={-node.radius - 35}
                          textAnchor="middle"
                          fontSize={11}
                          fill="hsl(var(--popover-foreground))"
                          fontWeight="500"
                        >
                          {truncateTitle(node.title, 30)}
                        </text>
                        <text
                          y={-node.radius - 20}
                          textAnchor="middle"
                          fontSize={9}
                          fill="hsl(var(--muted-foreground))"
                        >
                          {articleRoleDisplayNames[node.role] || node.role} | {node.incomingLinks} in, {node.outgoingLinks} out
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" data-testid="legend-roles">
          {Array.from(new Set(nodes.map((n) => n.role))).map((role) => (
            <div key={role} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: roleColors[role] || roleColors.general }}
              />
              <span className="text-xs text-muted-foreground">
                {articleRoleDisplayNames[role] || role}
              </span>
            </div>
          ))}
        </div>

        {Object.keys(linkStats.roleConnections).length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Link Patterns</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(linkStats.roleConnections)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([connection, count]) => (
                  <Badge key={connection} variant="secondary" className="text-xs">
                    {connection}: {count}
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
