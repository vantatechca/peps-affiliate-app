import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Sparkles } from "lucide-react";

// Per-merchant add-offer dialog. Triggered from a merchant row's action menu.
// Reuses the existing merchant data on the server (no need to re-enter city /
// website etc.), only collects peptide name + price + commission %.

const EMPTY = {
  peptideName: "",
  priceUsd: "",
  commissionPct: "20",
};

export function AddOfferDialog({
  open,
  onOpenChange,
  merchantId,
  merchantName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  merchantId: string | null;
  merchantName: string | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY });
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY });
      setErr("");
    }
  }, [open]);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const valid =
    form.peptideName.trim().length > 0 &&
    parseFloat(form.priceUsd) > 0 &&
    !!merchantId;

  const mut = useMutation({
    mutationFn: async () => {
      if (!merchantId) throw new Error("Missing merchant");
      const r = await fetch(`/api/admin/merchants/${merchantId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          peptideName: form.peptideName.trim(),
          priceUsd: parseFloat(form.priceUsd),
          commissionPct: parseFloat(form.commissionPct || "20"),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed to add offer");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/companies/all"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/affexch-summary"] });
      onOpenChange(false);
    },
    onError: (e: any) => setErr(e?.message || "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Add offer
          </DialogTitle>
          <DialogDescription>
            Add another peptide offer to{" "}
            <span className="font-semibold text-foreground">
              {merchantName ?? "this merchant"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Peptide *</Label>
            <Input
              value={form.peptideName}
              onChange={(e) => set("peptideName", e.target.value)}
              placeholder="BPC-157"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Price (USD) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.priceUsd}
                onChange={(e) => set("priceUsd", e.target.value)}
                placeholder="120.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Commission %</Label>
              <Input
                type="number"
                step="0.5"
                value={form.commissionPct}
                onChange={(e) => set("commissionPct", e.target.value)}
                placeholder="20"
              />
            </div>
          </div>

          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Adding…" : "Add offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
