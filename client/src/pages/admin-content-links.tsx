import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Inbox,
  Filter,
} from "lucide-react";

// AFFEXCH Phase 7 — admin content-link approval queue.
// Lists submitted links, lets admin approve or reject. Approval auto-recomputes
// the affiliate's tier on the server and fires an in-app notification.

type StatusFilter = "pending" | "approved" | "rejected" | "all";

type AdminLink = {
  id: string;
  url: string;
  platform: "youtube" | "tiktok" | "instagram";
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  approvedAt: string | null;
  createdAt: string;
  creatorId: string;
  creatorUsername: string;
  creatorEmail: string;
  creatorFirstName: string | null;
  creatorLastName: string | null;
};

const STATUS_LABEL: Record<AdminLink["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function StatusBadge({ status }: { status: AdminLink["status"] }) {
  if (status === "approved") {
    return (
      <Badge variant="outline" className="gap-1 border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="outline" className="gap-1 border-destructive/40 text-destructive">
        <XCircle className="h-3 w-3" /> Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  );
}

export default function AdminContentLinks() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [rejectTarget, setRejectTarget] = useState<AdminLink | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const queryKey = filter === "all"
    ? ["/api/admin/content-links"]
    : ["/api/admin/content-links", { status: filter }];

  const { data: links, isLoading } = useQuery<AdminLink[]>({
    queryKey,
    queryFn: async () => {
      const url = filter === "all"
        ? "/api/admin/content-links"
        : `/api/admin/content-links?status=${filter}`;
      const r = await fetch(url, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/content-links/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Approve failed");
      }
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/content-links"] }),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const r = await fetch(`/api/admin/content-links/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Reject failed");
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/content-links"] });
      setRejectTarget(null);
      setRejectReason("");
    },
  });

  const counts = {
    pending: links?.filter((l) => l.status === "pending").length ?? 0,
    approved: links?.filter((l) => l.status === "approved").length ?? 0,
    rejected: links?.filter((l) => l.status === "rejected").length ?? 0,
  };

  return (
    <div className="min-h-screen bg-background fx-page">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 space-y-4">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground fx-text-in fx-text-glow">
            <span className="fx-text-sweep">Content Link Approval</span><span className="fx-caret ml-1">_</span>
          </h1>
          <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 fx-slide-up fx-delay-2">
            Review affiliate-submitted social posts. Approving a link counts toward the affiliate's tier (1/5/10/20 thresholds).
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
              <Filter className="h-4 w-4 text-primary" />
              <span>Filter</span>
              <div className="flex flex-wrap gap-1.5 ml-auto">
                {(["pending", "approved", "rejected", "all"] as StatusFilter[]).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={filter === f ? "default" : "outline"}
                    onClick={() => setFilter(f)}
                    className="text-[11px] h-7"
                  >
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                    {filter !== "all" && f === filter && links && (
                      <span className="ml-1 opacity-70">({links.length})</span>
                    )}
                  </Button>
                ))}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Loading…</p>
            ) : !links || links.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Inbox className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  No {filter !== "all" ? filter : ""} links to review.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[160px]">Affiliate</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead className="min-w-[200px]">URL</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <div className="text-xs font-medium">
                            {l.creatorFirstName} {l.creatorLastName ?? ""}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            @{l.creatorUsername} · {l.creatorEmail}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {l.platform}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <span className="truncate max-w-[260px] inline-block align-middle">{l.url}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                          {l.rejectionReason && (
                            <div className="text-[10px] text-destructive mt-1">
                              Reason: {l.rejectionReason}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={l.status} />
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(l.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            {l.status !== "approved" && (
                              <Button
                                size="sm"
                                onClick={() => approve.mutate(l.id)}
                                disabled={approve.isPending}
                                className="h-7 text-[11px] gap-1"
                              >
                                <CheckCircle2 className="h-3 w-3" /> Approve
                              </Button>
                            )}
                            {l.status !== "rejected" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setRejectTarget(l); setRejectReason(""); }}
                                disabled={reject.isPending}
                                className="h-7 text-[11px] gap-1"
                              >
                                <XCircle className="h-3 w-3" /> Reject
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject content link</DialogTitle>
            <DialogDescription>
              Optionally tell the affiliate why their link was rejected. They'll see this message in their dashboard notification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="Reason (optional, up to 500 chars)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={reject.isPending}
              onClick={() => rejectTarget && reject.mutate({ id: rejectTarget.id, reason: rejectReason.trim() })}
            >
              {reject.isPending ? "Rejecting…" : "Reject link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
