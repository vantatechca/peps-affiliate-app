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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { UserPlus, AlertCircle } from "lucide-react";

// Manual single-merchant add dialog. Admin can also use the CSV import for
// bulk — this is the one-off path. Same backend shape; if a merchant with
// the same legal name already exists, the offer is appended to it.

const EMPTY = {
  legalName: "",
  tradeName: "",
  city: "",
  country: "US",
  website: "",
  neighborhood: "",
  peptideName: "",
  priceUsd: "",
  commissionPct: "20",
};

export function AddMerchantDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
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
    form.legalName.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.peptideName.trim().length > 0 &&
    parseFloat(form.priceUsd) > 0;

  const mut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          legalName: form.legalName.trim(),
          tradeName: form.tradeName.trim(),
          city: form.city.trim(),
          country: form.country,
          website: form.website.trim(),
          neighborhood: form.neighborhood.trim(),
          peptideName: form.peptideName.trim(),
          priceUsd: parseFloat(form.priceUsd),
          commissionPct: parseFloat(form.commissionPct || "20"),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed to add merchant");
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Add merchant
          </DialogTitle>
          <DialogDescription>
            Add a single peptide merchant + their first offer. For bulk uploads use Import CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Legal name *</Label>
              <Input
                value={form.legalName}
                onChange={(e) => set("legalName", e.target.value)}
                placeholder="Tribeca Compound Pharmacy"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Trade name</Label>
              <Input
                value={form.tradeName}
                onChange={(e) => set("tradeName", e.target.value)}
                placeholder="Defaults to legal name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">City *</Label>
              <Input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Toronto"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Country</Label>
              <Select value={form.country} onValueChange={(v) => set("country", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Website</Label>
              <Input
                type="url"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://merchant.example"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Neighborhood</Label>
              <Input
                value={form.neighborhood}
                onChange={(e) => set("neighborhood", e.target.value)}
                placeholder="Tribeca (optional)"
              />
            </div>
          </div>

          <div className="border-t pt-3 mt-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              First offer
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 sm:col-span-3">
                <Label className="text-xs">Peptide *</Label>
                <Input
                  value={form.peptideName}
                  onChange={(e) => set("peptideName", e.target.value)}
                  placeholder="BPC-157"
                />
              </div>
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
          </div>

          <div className="rounded-md border bg-muted/40 p-2.5 text-[11px] text-muted-foreground flex gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <p>
              If a merchant with the same legal name already exists, the new offer will be
              attached to it instead of creating a duplicate.
            </p>
          </div>

          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Adding…" : "Add merchant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
