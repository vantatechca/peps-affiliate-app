import { useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Globe2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";

// TopoJSON for world map - using a CDN URL
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Country code to name mapping for common codes
const COUNTRY_NAMES: Record<string, string> = {
  "US": "United States",
  "USA": "United States",
  "United States": "United States",
  "GB": "United Kingdom",
  "UK": "United Kingdom",
  "United Kingdom": "United Kingdom",
  "CA": "Canada",
  "Canada": "Canada",
  "AU": "Australia",
  "Australia": "Australia",
  "DE": "Germany",
  "Germany": "Germany",
  "FR": "France",
  "France": "France",
  "IN": "India",
  "India": "India",
  "BR": "Brazil",
  "Brazil": "Brazil",
  "MX": "Mexico",
  "Mexico": "Mexico",
  "JP": "Japan",
  "Japan": "Japan",
  "CN": "China",
  "China": "China",
  "IT": "Italy",
  "Italy": "Italy",
  "ES": "Spain",
  "Spain": "Spain",
  "NL": "Netherlands",
  "Netherlands": "Netherlands",
  "PL": "Poland",
  "Poland": "Poland",
  "SE": "Sweden",
  "Sweden": "Sweden",
  "NO": "Norway",
  "Norway": "Norway",
  "DK": "Denmark",
  "Denmark": "Denmark",
  "FI": "Finland",
  "Finland": "Finland",
  "BE": "Belgium",
  "Belgium": "Belgium",
  "AT": "Austria",
  "Austria": "Austria",
  "CH": "Switzerland",
  "Switzerland": "Switzerland",
  "IE": "Ireland",
  "Ireland": "Ireland",
  "PT": "Portugal",
  "Portugal": "Portugal",
  "NZ": "New Zealand",
  "New Zealand": "New Zealand",
  "SG": "Singapore",
  "Singapore": "Singapore",
  "PH": "Philippines",
  "Philippines": "Philippines",
  "ID": "Indonesia",
  "Indonesia": "Indonesia",
  "MY": "Malaysia",
  "Malaysia": "Malaysia",
  "TH": "Thailand",
  "Thailand": "Thailand",
  "VN": "Vietnam",
  "Vietnam": "Vietnam",
  "KR": "South Korea",
  "South Korea": "South Korea",
  "RU": "Russia",
  "Russia": "Russia",
  "ZA": "South Africa",
  "South Africa": "South Africa",
  "AR": "Argentina",
  "Argentina": "Argentina",
  "CL": "Chile",
  "Chile": "Chile",
  "CO": "Colombia",
  "Colombia": "Colombia",
  "AE": "United Arab Emirates",
  "United Arab Emirates": "United Arab Emirates",
  "SA": "Saudi Arabia",
  "Saudi Arabia": "Saudi Arabia",
  "IL": "Israel",
  "Israel": "Israel",
  "EG": "Egypt",
  "Egypt": "Egypt",
  "NG": "Nigeria",
  "Nigeria": "Nigeria",
  "KE": "Kenya",
  "Kenya": "Kenya",
  "PK": "Pakistan",
  "Pakistan": "Pakistan",
  "BD": "Bangladesh",
  "Bangladesh": "Bangladesh",
  "TR": "Turkey",
  "Turkey": "Turkey",
  "UA": "Ukraine",
  "Ukraine": "Ukraine",
  "CZ": "Czech Republic",
  "Czech Republic": "Czech Republic",
  "RO": "Romania",
  "Romania": "Romania",
  "HU": "Hungary",
  "Hungary": "Hungary",
  "GR": "Greece",
  "Greece": "Greece",
};

// Normalize country name for matching
function normalizeCountryName(name: string): string {
  if (!name) return "";
  const normalized = COUNTRY_NAMES[name] || name;
  return normalized.toLowerCase().trim();
}

interface GeographyData {
  country: string;
  count: number;
}

interface GeographicHeatmapProps {
  data: GeographyData[];
  title?: string;
  className?: string;
}

export function GeographicHeatmap({ data, title = "Geographic Distribution", className = "" }: GeographicHeatmapProps) {
  const [tooltipContent, setTooltipContent] = useState<{ name: string; count: number } | null>(null);
  const [position, setPosition] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 });

  // Create a map of normalized country names to counts
  const countryDataMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((item) => {
      const normalizedName = normalizeCountryName(item.country);
      if (normalizedName) {
        map.set(normalizedName, (map.get(normalizedName) || 0) + item.count);
      }
    });
    return map;
  }, [data]);

  const maxCount = useMemo(() => {
    return Math.max(...data.map((d) => d.count), 1);
  }, [data]);

  // Color scale from light blue to dark blue
  const colorScale = useMemo(() => {
    return scaleLinear<string>()
      .domain([0, maxCount])
      .range(["#e0f2fe", "#0369a1"]);
  }, [maxCount]);

  const handleZoomIn = () => {
    if (position.zoom >= 4) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom * 1.5 }));
  };

  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom / 1.5 }));
  };

  const handleReset = () => {
    setPosition({ coordinates: [0, 20], zoom: 1 });
  };

  const handleMoveEnd = (position: { coordinates: [number, number]; zoom: number }) => {
    setPosition(position);
  };

  if (data.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <Globe2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No geographic data yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Clicks with location data will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Map Controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          onClick={handleZoomIn}
          disabled={position.zoom >= 4}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          onClick={handleZoomOut}
          disabled={position.zoom <= 1}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          onClick={handleReset}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Map */}
      <TooltipProvider>
        <div className="h-[320px] w-full rounded-lg overflow-hidden border bg-sky-50/50">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 120,
            }}
            style={{ width: "100%", height: "100%" }}
          >
            <ZoomableGroup
              center={position.coordinates}
              zoom={position.zoom}
              onMoveEnd={handleMoveEnd}
              minZoom={1}
              maxZoom={4}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const geoName = geo.properties.name || "";
                    const normalizedGeoName = normalizeCountryName(geoName);
                    const count = countryDataMap.get(normalizedGeoName) || 0;
                    const hasData = count > 0;

                    return (
                      <Tooltip key={geo.rsmKey}>
                        <TooltipTrigger asChild>
                          <Geography
                            geography={geo}
                            fill={hasData ? colorScale(count) : "#f1f5f9"}
                            stroke="#cbd5e1"
                            strokeWidth={0.5}
                            style={{
                              default: {
                                outline: "none",
                                transition: "fill 0.2s",
                              },
                              hover: {
                                fill: hasData ? colorScale(count) : "#e2e8f0",
                                outline: "none",
                                cursor: "pointer",
                                filter: "brightness(0.9)",
                              },
                              pressed: {
                                outline: "none",
                              },
                            }}
                            onMouseEnter={() => {
                              setTooltipContent({ name: geoName, count });
                            }}
                            onMouseLeave={() => {
                              setTooltipContent(null);
                            }}
                          />
                        </TooltipTrigger>
                        {tooltipContent && tooltipContent.name === geoName && (
                          <TooltipContent>
                            <div className="text-sm">
                              <p className="font-semibold">{geoName}</p>
                              <p className="text-muted-foreground">
                                {count > 0 ? `${count} creator${count > 1 ? "s" : ""}` : "No data"}
                              </p>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        </div>
      </TooltipProvider>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Fewer</span>
          <div className="flex h-3 w-32 rounded overflow-hidden">
            <div className="flex-1" style={{ background: "linear-gradient(to right, #e0f2fe, #0369a1)" }} />
          </div>
          <span className="text-xs text-muted-foreground">More</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {data.length} {data.length === 1 ? "country" : "countries"}
        </span>
      </div>

      {/* Country List */}
      <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
        {data.slice(0, 10).map((item) => (
          <div key={item.country} className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: colorScale(item.count) }}
            />
            <div className="flex-1 text-sm font-medium truncate" title={item.country}>
              {item.country}
            </div>
            <div className="text-sm text-muted-foreground flex-shrink-0">
              {item.count} {item.count === 1 ? "creator" : "creators"}
            </div>
          </div>
        ))}
        {data.length > 10 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{data.length - 10} more countries
          </p>
        )}
      </div>
    </div>
  );
}

export default GeographicHeatmap;
