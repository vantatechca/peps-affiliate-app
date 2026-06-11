import { useMemo } from "react";
import { geoAlbers, geoPath, geoContains } from "d3-geo";
import { feature } from "topojson-client";
import worldTopo from "world-atlas/countries-110m.json";
import statesTopo from "us-atlas/states-10m.json";

const W = 1000;
const H = 640;

// US states + Canadian provinces where payouts land (name + lng/lat)
export const HUBS = [
  { name: "CALIFORNIA", lng: -118.24, lat: 34.05 },
  { name: "TEXAS", lng: -96.8, lat: 32.78 },
  { name: "NEW YORK", lng: -74.0, lat: 40.71 },
  { name: "FLORIDA", lng: -80.19, lat: 25.76 },
  { name: "ILLINOIS", lng: -87.63, lat: 41.88 },
  { name: "WASHINGTON", lng: -122.33, lat: 47.61 },
  { name: "COLORADO", lng: -104.99, lat: 39.74 },
  { name: "GEORGIA", lng: -84.39, lat: 33.75 },
  { name: "ARIZONA", lng: -112.07, lat: 33.45 },
  { name: "MASSACHUSETTS", lng: -71.06, lat: 42.36 },
  { name: "ONTARIO", lng: -79.38, lat: 43.65, ca: true },
  { name: "QUEBEC", lng: -73.57, lat: 45.5, ca: true },
  { name: "BRITISH COLUMBIA", lng: -123.12, lat: 49.28, ca: true },
  { name: "ALBERTA", lng: -114.07, lat: 51.05, ca: true },
  { name: "MANITOBA", lng: -97.14, lat: 49.9, ca: true },
];

export default function NorthAmericaMap({ fireIndex, fireKey }) {
  const geo = useMemo(() => {
    const countries = feature(worldTopo, worldTopo.objects.countries).features;
    const byId = (id) => countries.find((c) => String(c.id) === id);
    const usa = byId("840");
    const canada = byId("124");
    const mexico = byId("484");
    const states = feature(statesTopo, statesTopo.objects.states).features;

    // frame on continental US + southern Canada via the payout points + corner anchors
    const anchors = [
      [-123, 48.8], [-66.5, 45], [-117, 32.5], [-81, 26],
      [-95, 29.5], [-71, 42.4], [-104, 50], [-88, 45],
    ];
    const fitObj = {
      type: "MultiPoint",
      coordinates: [...HUBS.map((h) => [h.lng, h.lat]), ...anchors],
    };
    const proj = geoAlbers().rotate([98, 0]).center([0, 39]).parallels([29.5, 45.5]);
    proj.fitExtent([[50, 70], [W - 50, H - 70]], fitObj);
    const path = geoPath(proj);

    // dot-matrix fill of the US + Canada landmass
    const dots = [];
    for (let lng = -125; lng <= -58; lng += 1.1) {
      for (let lat = 25; lat <= 55; lat += 1.1) {
        const inUS = usa && geoContains(usa, [lng, lat]);
        const inCA = canada && geoContains(canada, [lng, lat]);
        if (inUS || inCA) {
          const xy = proj([lng, lat]);
          if (xy) dots.push({ x: xy[0], y: xy[1], ca: !inUS && inCA });
        }
      }
    }

    const hubs = HUBS.map((h) => {
      const xy = proj([h.lng, h.lat]) || [0, 0];
      return { ...h, x: xy[0], y: xy[1] };
    });

    return {
      dots,
      hubs,
      usPath: usa ? path(usa) : "",
      caPath: canada ? path(canada) : "",
      mxPath: mexico ? path(mexico) : "",
      statePaths: states.map((s) => path(s)),
    };
  }, []);

  const fired = fireIndex != null ? geo.hubs[fireIndex] : null;

  return (
    <svg className="na-map" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <g className="na-states">
        {geo.statePaths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <path className="na-country na-mx" d={geo.mxPath} />
      <path className="na-country na-us" d={geo.usPath} />
      <path className="na-country na-ca" d={geo.caPath} />

      <g className="na-dots">
        {geo.dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r="1.15" className={d.ca ? "ca" : ""} />
        ))}
      </g>

      {geo.hubs.map((h, i) => (
        <g key={h.name} className="na-hub" style={{ "--d": `${(i % 7) * 0.32}s` }}>
          <circle cx={h.x} cy={h.y} r="7" className="na-hub-ring" />
          <circle cx={h.x} cy={h.y} r="2.6" className="na-hub-core" />
        </g>
      ))}

      {fired && (
        <g key={fireKey} className="na-fire">
          <circle cx={fired.x} cy={fired.y} r="6" className="na-burst" />
          <circle cx={fired.x} cy={fired.y} r="3.4" className="na-burst-core" />
        </g>
      )}
    </svg>
  );
}
