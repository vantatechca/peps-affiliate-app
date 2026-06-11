import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  useAffiliateContentLinks,
  type ContentLink,
} from "../components/AffexchDashboardSections";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Link as LinkIcon, CheckCircle2, XCircle, Clock, Send, Instagram, Music2, Youtube } from "lucide-react";

type StatusFilter = "all" | "approved" | "pending" | "rejected";

export default function CreatorLinksPage() {
  const { data: links } = useAffiliateContentLinks();
  const rows = links ?? [];
  const [filter, setFilter] = useState<StatusFilter>("all");

  const counts = useMemo(() => {
    const c = { all: rows.length, pending: 0, approved: 0, rejected: 0 };
    for (const r of rows) c[r.status as keyof typeof c]++;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  return (
    <div className="max-w-4xl mx-auto space-y-4 fx-page">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground fx-text-in fx-text-glow"><span className="fx-text-sweep">My Links</span><span className="fx-caret ml-1">_</span></h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 fx-slide-up fx-delay-2">
            Every link you've submitted, with its current review status.
          </p>
        </div>
        <Link href="/creator/submit-link">
          <a>
            <Button size="sm" className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Submit new
            </Button>
          </a>
        </Link>
      </header>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")} label="All" count={counts.all} />
        <FilterPill
          active={filter === "approved"}
          onClick={() => setFilter("approved")}
          label="Approved"
          count={counts.approved}
          accent="emerald"
        />
        <FilterPill
          active={filter === "pending"}
          onClick={() => setFilter("pending")}
          label="Pending"
          count={counts.pending}
          accent="amber"
        />
        <FilterPill
          active={filter === "rejected"}
          onClick={() => setFilter("rejected")}
          label="Rejected"
          count={counts.rejected}
          accent="destructive"
        />
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <LinkIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">
              {filter === "all" ? "No links yet" : `No ${filter} links`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {filter === "all"
                ? "Submit your first link to start climbing the tier ladder."
                : "Try another filter or submit a new link."}
            </p>
            {filter === "all" && (
              <Link href="/creator/submit-link">
                <a>
                  <Button size="sm" className="mt-4 gap-1.5">
                    <Send className="h-3.5 w-3.5" />
                    Submit a link
                  </Button>
                </a>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2 fx-stagger">
          {visible.map((l) => (
            <LinkRow key={l.id} link={l} />
          ))}
        </ul>
      )}
    </div>
  );
}

const PLATFORM_ICON: Record<ContentLink["platform"], any> = {
  instagram: Instagram,
  tiktok: Music2,
  youtube: Youtube,
};

function LinkRow({ link: l }: { link: ContentLink }) {
  const Icon = PLATFORM_ICON[l.platform];
  return (
    <li>
      <Card className="fx-card">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  {l.platform}
                </span>
                <StatusBadge status={l.status} />
              </div>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-1 text-xs sm:text-sm text-foreground hover:text-primary truncate"
                title={l.url}
              >
                {l.url}
              </a>
              <div className="text-[10px] text-muted-foreground mt-1">
                Submitted {new Date(l.createdAt).toLocaleDateString()}
                {l.approvedAt && ` · Approved ${new Date(l.approvedAt).toLocaleDateString()}`}
              </div>
              {l.status === "rejected" && l.rejectionReason && (
                <div className="mt-2 text-[11px] rounded-md border border-destructive/30 bg-destructive/5 text-destructive p-2">
                  Reason: {l.rejectionReason}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

function StatusBadge({ status }: { status: ContentLink["status"] }) {
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

function FilterPill({
  active,
  onClick,
  label,
  count,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  accent?: "emerald" | "amber" | "destructive";
}) {
  const base = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors min-h-7";
  const inactive = "border-border bg-background text-muted-foreground hover:text-foreground";
  const activeBg =
    accent === "emerald"
      ? "border-emerald-400 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : accent === "amber"
      ? "border-amber-400 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
      : accent === "destructive"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : "border-primary bg-primary/15 text-primary";
  return (
    <button type="button" onClick={onClick} className={`${base} ${active ? activeBg : inactive}`}>
      <span>{label}</span>
      <span className={`text-[10px] font-mono ${active ? "" : "text-muted-foreground/70"}`}>{count}</span>
    </button>
  );
}
