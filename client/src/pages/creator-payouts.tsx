import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
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
  Save,
  AlertCircle,
  Send,
} from "lucide-react";

type Balance = {
  earned: number;
  paid: number;
  pending: number;
  available: number;
  minPayout: number;
};

type PayoutMethod = {
  id: string;
  creatorId: string;
  method: "paypal" | "interac" | "crypto" | "wire" | "other";
  details: Record<string, any>;
  updatedAt: string;
};

type Payout = {
  id: string;
  amount: string;
  method: string;
  status: "pending" | "paid" | "cancelled";
  reference: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
};

const METHODS = [
  { value: "paypal", label: "PayPal", hint: "Most common. We send to your PayPal email." },
  { value: "interac", label: "Interac e-Transfer", hint: "Canadian payouts. CAD via Interac to your email." },
  { value: "crypto", label: "Crypto (USDC/USDT)", hint: "Low fees, global. We send to your wallet address." },
  { value: "wire", label: "Bank wire", hint: "For larger payouts. Bank details required." },
  { value: "other", label: "Other", hint: "Describe in notes — admin will follow up." },
] as const;

export default function CreatorPayoutsPage() {
  const qc = useQueryClient();
  const { data: balance } = useQuery<Balance>({ queryKey: ["/api/affiliate/balance"] });
  const { data: method } = useQuery<PayoutMethod | null>({ queryKey: ["/api/affiliate/payout-method"] });
  const { data: payouts = [] } = useQuery<Payout[]>({ queryKey: ["/api/affiliate/payouts"] });

  const [requestOpen, setRequestOpen] = useState(false);
  const pending = payouts.filter((p) => p.status === "pending");
  const finished = payouts.filter((p) => p.status !== "pending");

  const canRequest =
    !!method && !!balance && balance.available >= balance.minPayout;
  const requestBlockReason = !method
    ? "Save a payment method first."
    : balance && balance.available < balance.minPayout
    ? `You need $${(balance.minPayout - (balance?.available ?? 0)).toFixed(2)} more to reach the $${balance.minPayout.toFixed(2)} minimum.`
    : "";

  return (
    <div className="max-w-4xl mx-auto space-y-4 fx-page">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground fx-text-in fx-text-glow"><span className="fx-text-sweep">Payouts</span><span className="fx-caret ml-1">_</span></h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 fx-slide-up fx-delay-2">
            Request your accrued commission. Admin reviews and sends the money via your saved method.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={!canRequest}
          onClick={() => setRequestOpen(true)}
          title={requestBlockReason}
        >
          <Send className="h-3.5 w-3.5" />
          Request payout
        </Button>
      </header>

      {/* Balance strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 fx-stagger fx-cards">
        <BalanceCard icon={DollarSign} label="Available" value={balance?.available} primary />
        <BalanceCard icon={Clock} label="Pending request" value={balance?.pending} />
        <BalanceCard icon={CheckCircle2} label="Lifetime paid" value={balance?.paid} />
        <BalanceCard icon={Wallet} label="Lifetime earned" value={balance?.earned} />
      </div>

      {/* Block reason / min payout reminder */}
      {balance && (
        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground flex gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Minimum payout is{" "}
            <span className="font-semibold text-foreground">${balance.minPayout.toFixed(2)}</span>.
            {requestBlockReason && (
              <span className="ml-1 text-amber-600 dark:text-amber-400">{requestBlockReason}</span>
            )}
            {!requestBlockReason && (
              <span className="ml-1">
                Click <span className="font-semibold text-foreground">Request payout</span> when you're ready.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Pending requests */}
      {pending.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" /> Pending requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {pending.map((p) => (
                <PendingRow key={p.id} payout={p} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <PayoutMethodForm
        method={method ?? null}
        onSaved={() => qc.invalidateQueries({ queryKey: ["/api/affiliate/payout-method"] })}
      />

      {/* History (paid / cancelled) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base">Payout history</CardTitle>
        </CardHeader>
        <CardContent>
          {finished.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No completed payouts yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {finished.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 text-xs p-2.5 rounded-md border bg-background"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-semibold text-sm">
                      ${parseFloat(p.amount).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {p.method}
                      {p.paidAt && ` · paid ${new Date(p.paidAt).toLocaleDateString()}`}
                      {!p.paidAt && p.status === "cancelled" && ` · cancelled ${new Date(p.createdAt).toLocaleDateString()}`}
                    </div>
                    {p.reference && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Ref: {p.reference}
                      </div>
                    )}
                  </div>
                  <PayoutStatus status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <RequestPayoutDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        balance={balance}
        method={method ?? null}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["/api/affiliate/payouts"] });
          qc.invalidateQueries({ queryKey: ["/api/affiliate/balance"] });
        }}
      />
    </div>
  );
}

function BalanceCard({
  icon: Icon,
  label,
  value,
  primary,
}: {
  icon: any;
  label: string;
  value: number | undefined;
  primary?: boolean;
}) {
  return (
    <Card className="fx-card fx-card-scan">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className={`text-lg sm:text-xl font-bold ${primary ? "text-primary" : ""}`}>
          ${(value ?? 0).toFixed(2)}
        </div>
      </CardContent>
    </Card>
  );
}

function PayoutStatus({ status }: { status: Payout["status"] }) {
  if (status === "paid")
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Paid
      </Badge>
    );
  if (status === "cancelled")
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-destructive/40 text-destructive">
        <XCircle className="h-3 w-3" /> Cancelled
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-[10px] gap-1">
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  );
}

function PendingRow({ payout: p }: { payout: Payout }) {
  const qc = useQueryClient();
  const cancel = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/affiliate/payouts/${p.id}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/affiliate/payouts"] });
      qc.invalidateQueries({ queryKey: ["/api/affiliate/balance"] });
    },
  });
  return (
    <li className="flex items-center gap-3 text-xs p-2.5 rounded-md border bg-amber-50/40 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900 fx-pulse-glow">
      <div className="flex-1 min-w-0">
        <div className="font-mono font-semibold text-sm">${parseFloat(p.amount).toFixed(2)}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {p.method} · requested {new Date(p.createdAt).toLocaleDateString()}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          Awaiting admin to process the transfer.
        </div>
      </div>
      <PayoutStatus status={p.status} />
      <Button
        size="sm"
        variant="ghost"
        disabled={cancel.isPending}
        onClick={() => {
          if (confirm("Cancel this payout request?")) cancel.mutate();
        }}
        className="h-7 px-2"
      >
        Cancel
      </Button>
    </li>
  );
}

function RequestPayoutDialog({
  open,
  onClose,
  balance,
  method,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  balance: Balance | undefined;
  method: PayoutMethod | null;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open && balance) {
      setAmount(balance.available.toFixed(2));
      setNotes("");
      setErr("");
    }
  }, [open, balance]);

  const mut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/affiliate/payouts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: parseFloat(amount), notes }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed to request payout");
      return data;
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (e: any) => setErr(e?.message || "Failed"),
  });

  const amt = parseFloat(amount || "0");
  const min = balance?.minPayout ?? 50;
  const max = balance?.available ?? 0;
  const valid = Number.isFinite(amt) && amt >= min && amt <= max + 0.001;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" /> Request payout
          </DialogTitle>
          <DialogDescription>
            Admin will review your request and send the money via your saved method. Status updates appear on this page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {method && (
            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Sending to
              </div>
              <div className="font-semibold uppercase mt-0.5">{method.method}</div>
              <div className="text-muted-foreground mt-1 text-[11px] font-mono break-all">
                {Object.values(method.details ?? {}).filter(Boolean).join(" · ")}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">
              Amount (USD) — available ${max.toFixed(2)}, min ${min.toFixed(2)}
            </Label>
            <Input
              type="number"
              step="0.01"
              min={min}
              max={max}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`${min.toFixed(2)} – ${max.toFixed(2)}`}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything admin should know"
              className="min-h-[60px] text-xs"
            />
          </div>

          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={mut.isPending || !valid} onClick={() => mut.mutate()}>
            {mut.isPending ? "Submitting…" : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayoutMethodForm({
  method,
  onSaved,
}: {
  method: PayoutMethod | null;
  onSaved: () => void;
}) {
  const [picked, setPicked] = useState<typeof METHODS[number]["value"]>(method?.method ?? "paypal");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string>("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (method) {
      setPicked(method.method);
      setDetails(
        Object.fromEntries(
          Object.entries(method.details ?? {}).map(([k, v]) => [k, String(v ?? "")]),
        ),
      );
    }
  }, [method]);

  useEffect(() => {
    if (method?.method !== picked) setDetails({});
  }, [picked, method?.method]);

  const mut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/affiliate/payout-method", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ method: picked, details }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed to save");
      return data;
    },
    onSuccess: () => {
      setErr("");
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2000);
      onSaved();
    },
    onError: (e: any) => setErr(e?.message || "Failed to save"),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" /> How you'll get paid
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Payment method</Label>
          <Select value={picked} onValueChange={(v) => setPicked(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            {METHODS.find((m) => m.value === picked)?.hint}
          </p>
        </div>

        <MethodFields method={picked} details={details} onChange={setDetails} />

        {err && <p className="text-xs text-destructive">{err}</p>}

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-muted-foreground">
            {savedAt
              ? "Saved"
              : method
              ? `Last updated ${new Date(method.updatedAt).toLocaleDateString()}`
              : "Not set yet"}
          </span>
          <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            {mut.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MethodFields({
  method,
  details,
  onChange,
}: {
  method: string;
  details: Record<string, string>;
  onChange: (d: Record<string, string>) => void;
}) {
  const set = (k: string, v: string) => onChange({ ...details, [k]: v });

  if (method === "paypal") {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">PayPal email</Label>
        <Input
          type="email"
          value={details.email ?? ""}
          onChange={(e) => set("email", e.target.value)}
          placeholder="your-paypal@example.com"
        />
        <p className="text-[10px] text-muted-foreground">
          The email tied to your PayPal account — payouts land there.
        </p>
      </div>
    );
  }
  if (method === "interac") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Email (recipient)</Label>
            <Input
              type="email"
              value={details.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
              placeholder="registered-with-your-bank@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Phone (alternative)</Label>
            <Input
              type="tel"
              value={details.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+1 555 555 5555"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Security question + answer (optional)</Label>
          <Input
            value={details.securityAnswer ?? ""}
            onChange={(e) => set("securityAnswer", e.target.value)}
            placeholder={`e.g. "What's our promo prefix?" → PEP`}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Interac e-Transfer sends to either an email or phone number registered with your Canadian bank.
          Provide at least one. Auto-deposit users don't need the security question.
        </p>
      </div>
    );
  }
  if (method === "crypto") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs">Wallet address</Label>
            <Input
              value={details.wallet ?? ""}
              onChange={(e) => set("wallet", e.target.value)}
              placeholder="0x… (ETH) or T… (TRON)"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Network</Label>
            <Input
              value={details.network ?? "USDC-ERC20"}
              onChange={(e) => set("network", e.target.value)}
              placeholder="USDC-ERC20"
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Double-check the network — sending USDC to the wrong chain loses the funds.
        </p>
      </div>
    );
  }
  if (method === "wire") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Account holder name</Label>
            <Input
              value={details.accountHolder ?? ""}
              onChange={(e) => set("accountHolder", e.target.value)}
              placeholder="Full name on the account"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Account number / IBAN</Label>
            <Input
              value={details.accountNumber ?? ""}
              onChange={(e) => set("accountNumber", e.target.value)}
              placeholder="Account or IBAN"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Routing / SWIFT / BIC</Label>
            <Input
              value={details.routing ?? ""}
              onChange={(e) => set("routing", e.target.value)}
              placeholder="Routing number or SWIFT code"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bank name</Label>
            <Input
              value={details.bank ?? ""}
              onChange={(e) => set("bank", e.target.value)}
              placeholder="Bank name"
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Wire fees may be deducted from the payout — flag this in notes if you'd rather absorb them upstream.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Payment instructions</Label>
      <Input
        value={details.details ?? ""}
        onChange={(e) => set("details", e.target.value)}
        placeholder="How would you like to receive your payout?"
      />
      <p className="text-[10px] text-muted-foreground">
        Describe the method and any details admin needs to send the money (admin will follow up if anything's missing).
      </p>
    </div>
  );
}
