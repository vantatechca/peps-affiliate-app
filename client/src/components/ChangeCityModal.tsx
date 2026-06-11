import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { MapPin, Check, Search } from "lucide-react";
import { ALL_CITIES, TOP_CITIES } from "../landing-affexch/lib/cities";
import type { AffiliateMe } from "./AffexchDashboardSections";

// Creator-side modal for changing the saved city. Uses the same catalog
// (ALL_CITIES / TOP_CITIES) as the landing page so the AFFEXCH flow stays
// consistent. PATCH /api/affiliate/me/city persists the choice.

export function ChangeCityModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { data: me } = useQuery<AffiliateMe>({ queryKey: ["/api/affiliate/me"], enabled: open });
  const [query, setQuery] = useState("");
  const [err, setErr] = useState("");

  const currentCity = me?.city ?? null;

  useEffect(() => {
    if (!open) {
      setQuery("");
      setErr("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null; // null = show featured tiles instead of full list
    return ALL_CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q),
    );
  }, [query]);

  const mut = useMutation({
    mutationFn: async (cityName: string) => {
      const r = await fetch("/api/affiliate/me/city", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ city: cityName }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed to update city");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/affiliate/me"] });
      onOpenChange(false);
    },
    onError: (e: any) => setErr(e?.message || "Failed to update city"),
  });

  const handlePick = (cityName: string) => {
    if (mut.isPending) return;
    setErr("");
    mut.mutate(cityName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Change City
          </DialogTitle>
          <DialogDescription>
            Pick the city you create content for. Local peptide merchants will surface first on your dashboard.
          </DialogDescription>
        </DialogHeader>

        {currentCity && (
          <div className="text-xs text-muted-foreground">
            Current: <span className="font-semibold text-foreground">{currentCity}</span>
          </div>
        )}

        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 30+ cities…"
            className="pl-9"
            autoFocus
          />
        </div>

        {err && <p className="text-xs text-destructive">{err}</p>}

        <div className="max-h-[360px] overflow-y-auto">
          {filtered === null ? (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Featured cities</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TOP_CITIES.map((c: any) => (
                  <CityTile
                    key={c.id}
                    name={c.name}
                    country={c.country}
                    tag={c.tag}
                    selected={currentCity === c.name}
                    disabled={mut.isPending}
                    onClick={() => handlePick(c.name)}
                  />
                ))}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No cities match "{query}".</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filtered.map((c) => (
                <CityTile
                  key={c.id}
                  name={c.name}
                  country={c.country}
                  tag={c.tag}
                  selected={currentCity === c.name}
                  disabled={mut.isPending}
                  onClick={() => handlePick(c.name)}
                />
              ))}
            </div>
          )}
        </div>

        {currentCity && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              disabled={mut.isPending}
              onClick={() => {
                setErr("");
                mut.mutate(null as unknown as string);
              }}
            >
              Clear city
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CityTile({
  name,
  country,
  tag,
  selected,
  disabled,
  onClick,
}: {
  name: string;
  country: string;
  tag: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative text-left rounded-md border p-3 transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed ${
        selected ? "border-primary bg-primary/10" : "border-border bg-background"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{name}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{country}</div>
        </div>
        {selected ? (
          <Check className="h-4 w-4 text-primary shrink-0" />
        ) : (
          <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0">{tag}</span>
        )}
      </div>
    </button>
  );
}
