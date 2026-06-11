import { SubmitLinkSection, useAffiliateContentLinks } from "../components/AffexchDashboardSections";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { CheckCircle2, XCircle, Clock, ShieldCheck, AlertTriangle, Lightbulb } from "lucide-react";
import { Link } from "wouter";

export default function CreatorSubmitLinkPage() {
  const { data: links } = useAffiliateContentLinks();
  const recent = (links ?? []).slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto space-y-4 fx-page">
      <header>
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground fx-text-in fx-text-glow"><span className="fx-text-sweep">Submit a Link</span><span className="fx-caret ml-1">_</span></h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 fx-slide-up fx-delay-2">
          Send a post URL — once approved, it counts toward your tier.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <SubmitLinkSection />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> What gets approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs sm:text-sm space-y-2">
              <Bullet>Posts that visibly include your PEP code (caption, on-screen text, bio).</Bullet>
              <Bullet>Public URLs only — no private accounts or stories that expire.</Bullet>
              <Bullet>YouTube, TikTok, and Instagram. Reels and Shorts count.</Bullet>
              <Bullet>Original content. No reposts of others' videos.</Bullet>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Common reasons for rejection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-xs sm:text-sm space-y-2">
            <Bullet>Code not visible in the post — make sure it's in the caption or pinned comment.</Bullet>
            <Bullet>Private / unlisted post — admin can't verify it.</Bullet>
            <Bullet>Wrong platform — Twitter/X, Snapchat, and Discord don't qualify yet.</Bullet>
            <Bullet>Duplicate submission of a previously-rejected URL.</Bullet>
          </ul>
        </CardContent>
      </Card>

      {recent.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" /> Your recent submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recent.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center gap-2 text-xs p-2 rounded-md border bg-background"
                >
                  <span className="uppercase text-[10px] font-mono text-muted-foreground w-16 shrink-0">
                    {l.platform}
                  </span>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate text-foreground hover:underline"
                  >
                    {l.url}
                  </a>
                  <StatusBadge status={l.status} />
                </li>
              ))}
            </ul>
            <div className="mt-3 text-right">
              <Link href="/creator/links">
                <a className="text-[11px] text-muted-foreground hover:text-primary">
                  See all submissions →
                </a>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-primary mt-0.5">•</span>
      <span>{children}</span>
    </li>
  );
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved")
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-destructive/40 text-destructive">
        <XCircle className="h-3 w-3" /> Rejected
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-[10px] gap-1">
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  );
}
