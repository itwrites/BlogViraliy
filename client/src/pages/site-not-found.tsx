import { Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function SiteNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Globe className="h-16 w-16 text-muted-foreground mb-6" />
          <h1 className="text-3xl font-bold mb-3 text-foreground">Site Not Found</h1>
          <p className="text-center text-muted-foreground mb-2">
            The website you're trying to access is not registered in our system.
          </p>
          <p className="text-center text-sm text-muted-foreground font-mono">
            Domain: {window.location.hostname}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
