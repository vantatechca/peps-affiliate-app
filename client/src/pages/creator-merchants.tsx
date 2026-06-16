import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Store, ExternalLink, MapPin, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { MerchantLogo } from "../components/MerchantLogo";

type Level = { key: string; label: string; ordersToNext: number | null; nextLabel: string | null };
type Merchant = {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  level: Level;
  orders: number;
  movement: number | null;
  isNew: boolean;
};

const LEVEL_CLASS: Record<string, string> = {
  super: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300 dark:bg-fuchsia-950 dark:text-fuchsia-400 dark:border-fuchsia-800",
  performing: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  rising: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  new: "bg-muted text-muted-foreground border-border",
};

function Trend({ m }: { m: Merchant }) {
  if (m.isNew) return <span className="text-[10px] uppercase tracking-wider text-primary">New</span>;
  if (m.movement == null || m.movement === 0) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  return m.movement > 0
    ? <span className="flex items-center text-emerald-500 text-xs"><TrendingUp className="h-3.5 w-3.5 mr-0.5" />{m.movement}</span>
    : <span className="flex items-center text-rose-500 text-xs"><TrendingDown className="h-3.5 w-3.5 mr-0.5" />{Math.abs(m.movement)}</span>;
}

function LevelBadge({ level }: { level: Level }) {
  return <Badge className={`text-[10px] ${LEVEL_CLASS[level.key] ?? LEVEL_CLASS.new}`}>{level.label}</Badge>;
}

export default function CreatorMerchantsPage() {
  const { data: merchants = [], isLoading } = useQuery<Merchant[]>({ queryKey: ["/api/affiliate/merchants"] });
  const [selected, setSelected] = useState<Merchant | null>(null);

  const groups = useMemo(() => {
    const order = ["United States", "Canada"];
    const by: Record<string, Merchant[]> = {};
    for (const m of merchants) {
      const k = m.country || "Other";
      (by[k] ??= []).push(m);
    }
    const keys = [...order.filter((k) => by[k]), ...Object.keys(by).filter((k) => !order.includes(k)).sort()];
    return keys.map((k) => [k, by[k]] as const);
  }, [merchants]);

  return (
    <div className="max-w-5xl mx-auto space-y-4 fx-page">
      <header>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground fx-text-in fx-text-glow">
          <span className="fx-text-sweep">Merchants</span><span className="fx-caret ml-1">_</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Partner peptide merchants you can promote — grouped by country. Tap one for details.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading merchants…</p>
      ) : (
        groups.map(([country, list]) => (
          <section key={country} className="space-y-2">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              <h2 className="text-base sm:text-lg font-semibold">{country}</h2>
              <span className="text-[11px] text-muted-foreground">({list.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {list.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className="text-left rounded-lg border bg-card hover:border-primary/50 transition-colors p-3"
                  data-testid={`merchant-${m.domain ?? m.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <MerchantLogo domain={m.domain} name={m.name} className="h-9 w-9 rounded-md shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" /> {m.city || "—"}
                        </p>
                      </div>
                    </div>
                    <Trend m={m} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <LevelBadge level={m.level} />
                    <span className="text-[11px] text-muted-foreground">{m.orders} {m.orders === 1 ? "order" : "orders"}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MerchantLogo domain={selected.domain} name={selected.name} className="h-8 w-8 rounded-md" /> {selected.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <LevelBadge level={selected.level} />
                  <Trend m={selected} />
                </div>
                <Row label="Location">{[selected.city, selected.country].filter(Boolean).join(", ") || "—"}</Row>
                <Row label="Website">
                  {selected.website
                    ? <a href={selected.website} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline">{selected.domain ?? selected.website}<ExternalLink className="h-3.5 w-3.5" /></a>
                    : "—"}
                </Row>
                <Row label="Orders">{selected.orders}</Row>
                {selected.level.nextLabel && selected.level.ordersToNext != null && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    {selected.level.ordersToNext} more {selected.level.ordersToNext === 1 ? "order" : "orders"} to <span className="font-medium text-foreground">{selected.level.nextLabel}</span>
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-right text-foreground">{children}</span>
    </div>
  );
}
