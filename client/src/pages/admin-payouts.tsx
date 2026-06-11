import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Wallet,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  Inbox,
} from "lucide-react";

type QueueEntry = {
  creatorId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  earned: number;
  paid: number;
  pending: number;
  available: number;
  method: {
    method: string;
    details: Record<string, any>;
  } | null;
};

type PayoutRecord = {
  id: string;
  creatorId: string;
  amount: string;
  method: string;
  status: "pending" | "paid" | "cancelled";
  reference: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  creatorEmail: string | null;
  creatorFirstName: string | null;
  creatorLastName: string | null;
};

export default function AdminPayoutsPage() {
  const { data: queueData } = useQuery<{ queue: QueueEntry[]; minPayout: number }>({
    queryKey: ["/api/admin/payouts/queue"],
  });
  const { data: history = [] } = useQuery<PayoutRecord[]>({ queryKey: ["/api/admin/payouts"] });
  const queue = queueData?.queue ?? [];
  const minPayout = queueData?.minPayout ?? 50;

  const [issueTarget, setIssueTarget] = useState<QueueEntry | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<PayoutRecord | null>(null);

  const pendingRequests = history.filter((p) => p.status === "pending");
  const recentPaid = history.filter((p) => p.status === "paid").slice(0, 20);
  const recentCancelled = history.filter((p) => p.status === "cancelled").slice(0, 5);

  // Creators with available ≥ min who haven't requested anything yet.
  // These are leads for proactive admin-initiated payouts (rare path).
  const passiveQueue = queue.filter((q) => q.available >= minPayout);

  return (
    <div className="max-w-6xl mx-auto space-y-4 fx-page">
      <header>
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground fx-text-in fx-text-glow"><span className="fx-text-sweep">Payouts</span><span className="fx-caret ml-1">_</span></h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 fx-slide-up fx-delay-2">
          Creator-initiated payout requests land here. Send the money off-platform, then mark each request paid.
        </p>
      </header>

      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 fx-stagger fx-cards">
        <StatBox
          icon={Inbox}
          label="Pending requests"
          value={pendingRequests.length.toString()}
          accent={pendingRequests.length > 0 ? "amber" : undefined}
        />
        <StatBox
          icon={DollarSign}
          label="Pending $"
          value={`$${pendingRequests.reduce((s, p) => s + parseFloat(p.amount), 0).toFixed(2)}`}
        />
        <StatBox
          icon={CheckCircle2}
          label="Lifetime paid"
          value={`$${recentPaid.reduce((s, p) => s + parseFloat(p.amount), 0).toFixed(2)}+`}
        />
      </div>

      {/* PRIMARY: creator-initiated pending requests */}
      <Card className={pendingRequests.length > 0 ? "border-amber-300 dark:border-amber-900" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Inbox className="h-4 w-4 text-amber-500" /> Payout requests
            <span className="ml-auto text-[10px] text-muted-foreground font-normal">
              {pendingRequests.length} pending
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No pending requests. Creators submit a payout request from their dashboard.
            </p>
          ) : (
            <ul className="space-y-2">
              {pendingRequests.map((p) => (
                <RequestRow
                  key={p.id}
                  payout={p}
                  onConfirm={() => setConfirmTarget(p)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* SECONDARY: balances queue — admin-initiated proactive payouts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" /> Creators with available balance
            <span className="ml-auto text-[10px] text-muted-foreground font-normal">
              Min ${minPayout.toFixed(2)} · {passiveQueue.length} creator{passiveQueue.length === 1 ? "" : "s"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[11px] text-muted-foreground mb-3">
            Creators above the threshold who haven't submitted a request yet. You can issue a payout
            directly here if needed — usually it's better to wait for them to request it themselves.
          </p>
          {passiveQueue.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No creators have crossed the ${minPayout} threshold yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 pr-2">Creator</th>
                    <th className="text-left py-2 pr-2">Method</th>
                    <th className="text-right py-2 pr-2">Earned</th>
                    <th className="text-right py-2 pr-2">Paid</th>
                    <th className="text-right py-2 pr-2">Pending</th>
                    <th className="text-right py-2 pr-2">Available</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {passiveQueue.map((q) => {
                    const name =
                      [q.firstName, q.lastName].filter(Boolean).join(" ") || q.email || q.creatorId;
                    return (
                      <tr key={q.creatorId} className="border-b last:border-0">
                        <td className="py-2 pr-2">
                          <div className="font-medium">{name}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                            {q.email}
                          </div>
                        </td>
                        <td className="py-2 pr-2">
                          {q.method ? (
                            <MethodChip method={q.method.method} details={q.method.details} />
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Not set</span>
                          )}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono">${q.earned.toFixed(2)}</td>
                        <td className="py-2 pr-2 text-right font-mono text-muted-foreground">
                          ${q.paid.toFixed(2)}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono text-muted-foreground">
                          ${q.pending.toFixed(2)}
                        </td>
                        <td className="py-2 pr-2 text-right font-mono font-semibold text-primary">
                          ${q.available.toFixed(2)}
                        </td>
                        <td className="py-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!q.method}
                            onClick={() => setIssueTarget(q)}
                            className="gap-1.5"
                          >
                            <Send className="h-3 w-3" />
                            Issue
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently paid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Recently paid
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentPaid.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No payouts completed yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentPaid.map((p) => (
                <CompletedRow key={p.id} payout={p} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {recentCancelled.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-4 w-4" /> Recently cancelled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recentCancelled.map((p) => (
                <CompletedRow key={p.id} payout={p} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <IssuePayoutDialog target={issueTarget} onClose={() => setIssueTarget(null)} />
      <ConfirmPaidDialog target={confirmTarget} onClose={() => setConfirmTarget(null)} />
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
  label: string;
  value: string;
  accent?: "amber";
}) {
  return (
    <Card className={`fx-card fx-card-scan ${accent === "amber" ? "border-amber-300 dark:border-amber-900" : ""}`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className="text-lg sm:text-xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function MethodChip({ method, details }: { method: string; details: Record<string, any> }) {
  const summary =
    method === "paypal" || method === "interac"
      ? details?.email ?? ""
      : method === "crypto"
      ? `${(details?.wallet ?? "").slice(0, 10)}…`
      : method === "wire"
      ? details?.accountHolder ?? ""
      : details?.details ?? "";
  return (
    <div>
      <Badge variant="outline" className="text-[10px] uppercase">{method}</Badge>
      {summary && (
        <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{summary}</div>
      )}
    </div>
  );
}

function RequestRow({
  payout: p,
  onConfirm,
}: {
  payout: PayoutRecord;
  onConfirm: () => void;
}) {
  const qc = useQueryClient();
  const cancel = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/payouts/${p.id}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/payouts/queue"] });
    },
  });
  const name =
    [p.creatorFirstName, p.creatorLastName].filter(Boolean).join(" ") || p.creatorEmail || p.creatorId;
  return (
    <li className="flex items-center gap-3 p-2.5 rounded-md border bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900 fx-pulse-glow">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{name}</div>
        <div className="text-[10px] text-muted-foreground">
          {p.creatorEmail} · {p.method.toUpperCase()} · requested{" "}
          {new Date(p.createdAt).toLocaleDateString()}
        </div>
        {p.notes && (
          <div className="text-[11px] text-muted-foreground mt-1 italic">"{p.notes}"</div>
        )}
      </div>
      <div className="font-mono font-bold text-sm text-primary">${parseFloat(p.amount).toFixed(2)}</div>
      <Badge variant="outline" className="text-[10px] gap-1">
        <Clock className="h-3 w-3" /> Pending
      </Badge>
      <div className="flex gap-1">
        <Button size="sm" onClick={onConfirm} className="gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Mark paid
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={cancel.isPending}
          onClick={() => {
            if (confirm("Cancel this request?")) cancel.mutate();
          }}
        >
          <XCircle className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

function CompletedRow({ payout: p }: { payout: PayoutRecord }) {
  const name =
    [p.creatorFirstName, p.creatorLastName].filter(Boolean).join(" ") || p.creatorEmail || p.creatorId;
  const isPaid = p.status === "paid";
  return (
    <li className="flex items-center gap-3 text-xs p-2.5 rounded-md border bg-background">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{name}</div>
        <div className="text-[10px] text-muted-foreground">
          {p.method.toUpperCase()} ·{" "}
          {isPaid
            ? `paid ${p.paidAt ? new Date(p.paidAt).toLocaleDateString() : ""}`
            : `cancelled ${new Date(p.createdAt).toLocaleDateString()}`}
          {p.reference && ` · ref ${p.reference}`}
        </div>
      </div>
      <div className="font-mono font-semibold text-sm">${parseFloat(p.amount).toFixed(2)}</div>
      {isPaid ? (
        <Badge variant="outline" className="text-[10px] gap-1 border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" /> Paid
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[10px] gap-1 border-destructive/40 text-destructive">
          <XCircle className="h-3 w-3" /> Cancelled
        </Badge>
      )}
    </li>
  );
}

function ConfirmPaidDialog({
  target,
  onClose,
}: {
  target: PayoutRecord | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      if (!target) return;
      const r = await fetch(`/api/admin/payouts/${target.id}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reference, notes }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/payouts/queue"] });
      setReference("");
      setNotes("");
      setErr("");
      onClose();
    },
    onError: (e: any) => setErr(e?.message || "Failed"),
  });

  const closeAndReset = () => {
    setReference("");
    setNotes("");
    setErr("");
    onClose();
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && closeAndReset()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Mark request as paid
          </DialogTitle>
          <DialogDescription>
            Confirm you've sent the money off-platform. The creator's balance will move from pending to paid.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <div className="font-semibold">
                {[target.creatorFirstName, target.creatorLastName].filter(Boolean).join(" ") ||
                  target.creatorEmail ||
                  target.creatorId}
              </div>
              <div className="text-muted-foreground mt-0.5">
                Amount: <span className="text-primary font-mono">${parseFloat(target.amount).toFixed(2)}</span>{" "}
                · Method: <span className="uppercase">{target.method}</span>
              </div>
              {target.notes && (
                <div className="text-muted-foreground mt-1 italic">"{target.notes}"</div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Reference (PayPal txn id, wire ref, etc.)</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="optional"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Admin notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything to remember"
                className="min-h-[60px] text-xs"
              />
            </div>

            {err && <p className="text-xs text-destructive">{err}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={closeAndReset}>
            Cancel
          </Button>
          <Button disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Saving…" : "Confirm paid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IssuePayoutDialog({
  target,
  onClose,
}: {
  target: QueueEntry | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [markPaidNow, setMarkPaidNow] = useState(true);
  const [err, setErr] = useState("");

  if (target && !amount && parseFloat(amount || "0") === 0) {
    setTimeout(() => setAmount(target.available.toFixed(2)), 0);
  }

  const mut = useMutation({
    mutationFn: async () => {
      if (!target) return;
      const r = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          creatorId: target.creatorId,
          amount: parseFloat(amount),
          method: target.method?.method ?? "other",
          reference,
          notes,
          markPaid: markPaidNow,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/payouts/queue"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      closeAndReset();
    },
    onError: (e: any) => setErr(e?.message || "Failed"),
  });

  const closeAndReset = () => {
    setAmount("");
    setReference("");
    setNotes("");
    setErr("");
    onClose();
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && closeAndReset()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" /> Issue payout (admin-initiated)
          </DialogTitle>
          <DialogDescription>
            Use this when you want to proactively pay a creator who hasn't requested one. Most of the
            time you'll handle creator-initiated requests above instead.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <div className="font-semibold">
                {[target.firstName, target.lastName].filter(Boolean).join(" ") ||
                  target.email ||
                  target.creatorId}
              </div>
              <div className="text-muted-foreground mt-0.5">
                Available: <span className="text-primary font-mono">${target.available.toFixed(2)}</span>{" "}
                · Method: <span className="uppercase">{target.method?.method ?? "not set"}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Amount (USD)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Reference</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="optional" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything to remember"
                className="min-h-[60px] text-xs"
              />
            </div>

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={markPaidNow}
                onChange={(e) => setMarkPaidNow(e.target.checked)}
              />
              Mark as paid now (uncheck to leave as pending)
            </label>

            {err && <p className="text-xs text-destructive">{err}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={closeAndReset}>
            Cancel
          </Button>
          <Button disabled={mut.isPending || !amount || parseFloat(amount) <= 0} onClick={() => mut.mutate()}>
            {mut.isPending ? "Saving…" : "Issue payout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
