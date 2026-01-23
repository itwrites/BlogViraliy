import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Building2, FileText, Users } from "lucide-react";
import { cardVariants } from "./variants";
import type { SetState, SiteDataState } from "./types";

type BusinessSectionProps = {
  siteData: SiteDataState;
  setSiteData: SetState<SiteDataState>;
};

export function BusinessSection({ siteData, setSiteData }: BusinessSectionProps) {
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
            <CardTitle className="flex items-center gap-2 text-xl tracking-tight" data-testid="text-business-title">
              <Building2 className="h-5 w-5" />
              Business Profile
            </CardTitle>
            <CardDescription data-testid="text-business-description">
              Your business profile powers smarter AI content generation. The more detail you provide, the more accurately AI can match your brand voice, speak to your audience, and highlight what makes you unique.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Core Identity
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessDescription" data-testid="label-business-description">Business Description</Label>
                <Textarea
                  id="businessDescription"
                  data-testid="textarea-business-description"
                  placeholder="Describe what your business does, your mission, and what makes you unique..."
                  value={siteData.businessDescription}
                  onChange={(e) => setSiteData({ ...siteData, businessDescription: e.target.value })}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Used by AI to understand your core offerings and generate content that accurately represents your business.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="industry" data-testid="label-industry">Industry / Niche</Label>
                  <Input
                    id="industry"
                    data-testid="input-industry"
                    placeholder="e.g., SaaS, E-commerce, Healthcare, Finance..."
                    value={siteData.industry}
                    onChange={(e) => setSiteData({ ...siteData, industry: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Helps AI use industry-specific terminology, examples, and best practices.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label data-testid="label-brand-voice">Brand Voice</Label>
                  <Select
                    value={siteData.brandVoice}
                    onValueChange={(value) => setSiteData({ ...siteData, brandVoice: value })}
                  >
                    <SelectTrigger data-testid="select-brand-voice">
                      <SelectValue placeholder="Select a tone..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="authoritative">Authoritative</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Used by AI to write content that matches your brand's personality and communication style.
                  </p>
                </div>
              </div>

            </div>

            <div className="border-t pt-6 mt-6">
              <div className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" /> Audience & Positioning
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetAudience" data-testid="label-target-audience">Target Audience / ICP</Label>
                <Textarea
                  id="targetAudience"
                  data-testid="textarea-target-audience"
                  placeholder="Describe your ideal customer profile: demographics, pain points, goals, and what they're looking for..."
                  value={siteData.targetAudience}
                  onChange={(e) => setSiteData({ ...siteData, targetAudience: e.target.value })}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  AI uses this to craft content that speaks directly to your audience's needs, challenges, and goals.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valuePropositions" data-testid="label-value-propositions">Value Propositions</Label>
                <Textarea
                  id="valuePropositions"
                  data-testid="textarea-value-propositions"
                  placeholder="List your key selling points, unique benefits, and competitive advantages..."
                  value={siteData.valuePropositions}
                  onChange={(e) => setSiteData({ ...siteData, valuePropositions: e.target.value })}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  AI will naturally incorporate these selling points into generated content to reinforce your unique value.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="competitors" data-testid="label-competitors">Competitors</Label>
                <Textarea
                  id="competitors"
                  data-testid="textarea-competitors"
                  placeholder="List your main competitors (one per line or comma-separated)..."
                  value={siteData.competitors}
                  onChange={(e) => setSiteData({ ...siteData, competitors: e.target.value })}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Helps AI understand your market position and create content that differentiates you from alternatives.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
