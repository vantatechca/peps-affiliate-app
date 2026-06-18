import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "./ui/command";
import { MapPin, ChevronsUpDown, Check, Navigation } from "lucide-react";

// Searchable city picker (type-ahead) — handles hundreds of cities cleanly.
// Optionally shows a "current location" item at the top (IP-based).
export function CityCombobox({
  cities,
  value,
  onChange,
  placeholder = "Choose your city…",
  className = "",
  currentLocationLabel,
  onCurrentLocation,
}: {
  cities: string[];
  value: string | null;
  onChange: (city: string) => void;
  placeholder?: string;
  className?: string;
  currentLocationLabel?: string;
  onCurrentLocation?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={`inline-flex items-center justify-between gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs min-w-[180px] max-w-[240px] hover:border-primary/50 ${className}`}
          data-testid="city-combobox"
        >
          <span className="inline-flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className={`truncate ${value ? "text-foreground" : "text-muted-foreground"}`}>{value || placeholder}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[240px]" align="end">
        <Command>
          <CommandInput placeholder="Search city…" className="text-sm" />
          <CommandList>
            <CommandEmpty>No city found.</CommandEmpty>
            {currentLocationLabel && onCurrentLocation && (
              <CommandItem
                value="__current_location__"
                onSelect={() => { onCurrentLocation(); setOpen(false); }}
                className="text-primary"
              >
                <Navigation className="mr-2 h-4 w-4" />
                {currentLocationLabel}
              </CommandItem>
            )}
            {cities.map((c) => (
              <CommandItem
                key={c}
                value={c}
                onSelect={() => { onChange(c); setOpen(false); }}
              >
                <Check className={`mr-2 h-4 w-4 ${value === c ? "opacity-100" : "opacity-0"}`} />
                {c}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
