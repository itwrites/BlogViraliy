import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, User, UserPlus, Users } from "lucide-react";
import type { SiteAuthor } from "@shared/schema";
import { cardVariants } from "./variants";
import type { NewAuthorState, SetState } from "./types";

type AuthorsSectionProps = {
  authors: SiteAuthor[];
  newAuthor: NewAuthorState;
  setNewAuthor: SetState<NewAuthorState>;
  addAuthor: () => void;
  deleteAuthor: (authorId: string) => void;
  setAsDefaultAuthor: (authorId: string) => void;
  generateSlug: (name: string) => string;
};

export function AuthorsSection({ authors, newAuthor, setNewAuthor, addAuthor, deleteAuthor, setAsDefaultAuthor, generateSlug }: AuthorsSectionProps) {
  return (
                <div className="space-y-8">
                  <div className="bg-muted/50 rounded-xl p-4 border border-border">
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Authors appear on post bylines</p>
                        <p className="text-xs text-muted-foreground mt-1">Add team members with their bio and avatar to personalize your content.</p>
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
                      <CardTitle className="flex items-center gap-2 text-xl tracking-tight" data-testid="text-authors-title">
                        <User className="w-5 h-5" />
                        Content Authors
                      </CardTitle>
                      <CardDescription data-testid="text-authors-description">
                        Manage the authors and team members who write for your site. Author bylines add credibility to your content.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="font-medium">Add New Author</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="authorName">Author Name</Label>
                            <Input
                              id="authorName"
                              placeholder="e.g., Forbes Staff"
                              value={newAuthor.name}
                              onChange={(e) => {
                                const name = e.target.value;
                                setNewAuthor({
                                  ...newAuthor,
                                  name,
                                  slug: newAuthor.slug || generateSlug(name)
                                });
                              }}
                              data-testid="input-author-name"
                            />
                            <p className="text-xs text-muted-foreground">The display name shown on posts</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="authorSlug">URL Slug</Label>
                            <Input
                              id="authorSlug"
                              placeholder="e.g., forbes-staff"
                              value={newAuthor.slug}
                              onChange={(e) => setNewAuthor({ ...newAuthor, slug: e.target.value })}
                              data-testid="input-author-slug"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="authorBio">Bio (optional)</Label>
                            <Textarea
                              id="authorBio"
                              placeholder="Brief author biography..."
                              value={newAuthor.bio}
                              onChange={(e) => setNewAuthor({ ...newAuthor, bio: e.target.value })}
                              rows={2}
                              data-testid="input-author-bio"
                            />
                            <p className="text-xs text-muted-foreground">A brief description shown on the author's profile</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="authorAvatar">Avatar URL (optional)</Label>
                            <Input
                              id="authorAvatar"
                              placeholder="https://example.com/avatar.jpg"
                              value={newAuthor.avatarUrl}
                              onChange={(e) => setNewAuthor({ ...newAuthor, avatarUrl: e.target.value })}
                              data-testid="input-author-avatar"
                            />
                            <p className="text-xs text-muted-foreground">Profile picture URL (square image recommended)</p>
                          </div>
                          <div className="space-y-2 pt-6">
                            <div className="flex items-center gap-2">
                              <Switch
                                id="authorDefault"
                                checked={newAuthor.isDefault}
                                onCheckedChange={(checked) => setNewAuthor({ ...newAuthor, isDefault: checked })}
                              />
                              <Label htmlFor="authorDefault">Set as default author</Label>
                            </div>
                            <p className="text-xs text-muted-foreground">This author will be assigned to new posts automatically</p>
                          </div>
                        </div>
                        <Button onClick={addAuthor} className="gap-2" data-testid="button-add-author">
                          <UserPlus className="w-4 h-4" />
                          Add Author
                        </Button>
                      </div>
  
                      {authors.length > 0 && (
                        <div className="space-y-4 pt-4 border-t">
                          <h4 className="font-medium">Existing Authors</h4>
                          <div className="space-y-3">
                            {authors.map((author) => (
                              <motion.div
                                key={author.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                                data-testid={`author-card-${author.id}`}
                              >
                                <div className="flex items-center gap-3">
                                  {author.avatarUrl ? (
                                    <img
                                      src={author.avatarUrl}
                                      alt={author.name}
                                      className="w-10 h-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                      <User className="w-5 h-5 text-primary" />
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{author.name}</span>
                                      {author.isDefault && (
                                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                          Default
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-sm text-muted-foreground">/{author.slug}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!author.isDefault && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setAsDefaultAuthor(author.id)}
                                      data-testid={`button-set-default-${author.id}`}
                                    >
                                      Set Default
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteAuthor(author.id)}
                                    data-testid={`button-delete-author-${author.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  </motion.div>
                </div>
              
  );
}
