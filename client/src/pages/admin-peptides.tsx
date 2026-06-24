import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
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
import { FlaskConical, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";

// Admin management for the "Top peptide offers to promote" catalogue surfaced
// (shuffled daily) on the affiliate dashboard.

type Peptide = {
  id: string;
  productName: string;
  merchantUrl: string | null;
  discountPercent: number;
  commissionPercent: number;
  priceUsd: string | null;
  size: string | null;
  isActive: boolean;
  displayOrder: number | null;
  createdAt: string;
};

type FormState = {
  productName: string;
  merchantUrl: string;
  discountPercent: string;
  commissionPercent: string;
  priceUsd: string;
  size: string;
  displayOrder: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  productName: "",
  merchantUrl: "",
  discountPercent: "10",
  commissionPercent: "20",
  priceUsd: "",
  size: "",
  displayOrder: "",
  isActive: true,
};

export default function AdminPeptidesPage() {
  const qc = useQueryClient();
  const { data: peptides = [], isLoading } = useQuery<Peptide[]>({ queryKey: ["/api/admin/peptides"] });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Peptide | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [err, setErr] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Peptide | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/admin/peptides"] });
    qc.invalidateQueries({ queryKey: ["/api/affiliate/peptides"] });
  };

  const save = useMutation({
    mutationFn: async (payload: { id?: string; body: any }) => {
      const url = payload.id ? `/api/admin/peptides/${payload.id}` : "/api/admin/peptides";
      const r = await fetch(url, {
        method: payload.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload.body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed to save");
      return data;
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      setErr("");
    },
    onError: (e: any) => setErr(e?.message || "Failed to save"),
  });

  const toggle = useMutation({
    mutationFn: async (p: Peptide) => {
      const r = await fetch(`/api/admin/peptides/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productName: p.productName,
          merchantUrl: p.merchantUrl,
          discountPercent: p.discountPercent,
          commissionPercent: p.commissionPercent,
          priceUsd: p.priceUsd,
          size: p.size,
          displayOrder: p.displayOrder,
          isActive: !p.isActive,
        }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || "Failed to toggle");
      return r.json();
    },
    onSuccess: invalidate,
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/peptides/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || "Failed to delete");
      return r.json();
    },
    onSuccess: () => {
      invalidate();
      setConfirmDelete(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErr("");
    setDialogOpen(true);
  };

  const openEdit = (p: Peptide) => {
    setEditing(p);
    setForm({
      productName: p.productName,
      merchantUrl: p.merchantUrl ?? "",
      discountPercent: String(p.discountPercent),
      commissionPercent: String(p.commissionPercent),
      priceUsd: p.priceUsd ?? "",
      size: p.size ?? "",
      displayOrder: p.displayOrder == null ? "" : String(p.displayOrder),
      isActive: p.isActive,
    });
    setErr("");
    setDialogOpen(true);
  };

  const submit = () => {
    setErr("");
    if (!form.productName.trim()) return setErr("Product name is required");
    if (form.merchantUrl.trim() && !/^https?:\/\/.+/i.test(form.merchantUrl.trim())) {
      return setErr("Merchant URL must start with http:// or https:// (or leave it blank)");
    }
    save.mutate({
      id: editing?.id,
      body: {
        productName: form.productName.trim(),
        merchantUrl: form.merchantUrl.trim(),
        discountPercent: Number(form.discountPercent) || 0,
        commissionPercent: Number(form.commissionPercent) || 0,
        priceUsd: form.priceUsd.trim() === "" ? null : form.priceUsd.trim(),
        size: form.size.trim(),
        displayOrder: form.displayOrder === "" ? null : Number(form.displayOrder),
        isActive: form.isActive,
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" /> Hot Selling Peptides
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            The list shown (shuffled daily) on every affiliate's dashboard. Affiliate cards show the commission only.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add offer
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base">
            {peptides.length} {peptides.length === 1 ? "offer" : "offers"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : peptides.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No offers yet. Add your first peptide offer above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {peptides.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.merchantUrl ? (
                        <a
                          href={p.merchantUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-primary"
                        >
                          {p.productName}
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </a>
                      ) : (
                        <span>{p.productName}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{p.size || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {p.priceUsd != null && p.priceUsd !== "" ? `$${p.priceUsd}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{p.discountPercent}% off</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="text-[10px] bg-primary/15 text-primary border-primary/40">
                        {p.commissionPercent}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{p.displayOrder ?? "—"}</TableCell>
                    <TableCell>
                      <Switch checked={p.isActive} onCheckedChange={() => toggle.mutate(p)} disabled={toggle.isPending} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirmDelete(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditing(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit offer" : "Add offer"}</DialogTitle>
            <DialogDescription>Affiliates see the product name, discount, and commission.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="productName">Product name</Label>
              <Input
                id="productName"
                value={form.productName}
                onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
                placeholder="BPC-157 10mg"
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="merchantUrl">Merchant URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="merchantUrl"
                value={form.merchantUrl}
                onChange={(e) => setForm((f) => ({ ...f, merchantUrl: e.target.value }))}
                placeholder="https://merchant.com/product"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="size">Size</Label>
                <Input
                  id="size"
                  value={form.size}
                  onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                  placeholder="10mg"
                  maxLength={40}
                />
              </div>
              <div>
                <Label htmlFor="price">Price (USD)</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.priceUsd}
                  onChange={(e) => setForm((f) => ({ ...f, priceUsd: e.target.value }))}
                  placeholder="120.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="discount">Discount %</Label>
                <Input
                  id="discount"
                  type="number"
                  min={0}
                  max={100}
                  value={form.discountPercent}
                  onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="commission">Commission %</Label>
                <Input
                  id="commission"
                  type="number"
                  min={0}
                  max={100}
                  value={form.commissionPercent}
                  onChange={(e) => setForm((f) => ({ ...f, commissionPercent: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="order">Sort order</Label>
                <Input
                  id="order"
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
                  placeholder="—"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <Label htmlFor="active">Active (shown to affiliates)</Label>
            </div>
            {err && <p className="text-xs text-destructive">{err}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete offer</DialogTitle>
            <DialogDescription>
              Remove <strong>{confirmDelete?.productName}</strong> from the catalogue? This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={del.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && del.mutate(confirmDelete.id)}
              disabled={del.isPending}
            >
              {del.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
