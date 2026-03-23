import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMapEvents } from 'react-leaflet';
import { Accessibility, X, Train, ArrowUp, ArrowDown, Loader2, ChevronLeft } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

/* ─────────────────────────────────────────────
   Fonts injected once via a style tag
───────────────────────────────────────────── */
const FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Barlow+Condensed:wght@400;600;700&display=swap');
`;

/* ─────────────────────────────────────────────
   Polyline offset helper (parallel lines)
───────────────────────────────────────────── */
function offsetPolyline(latlngs, offsetDeg) {
  if (!latlngs || latlngs.length < 2) return latlngs;
  const first = latlngs[0];
  const last  = latlngs[latlngs.length - 1];
  const meanLat = (first[0] + last[0]) / 2;
  const dx = last[1] - first[1];
  const dy = last[0] - first[0];
  let perpLon = -dy;
  let perpLat =  dx;
  const cosLat = Math.cos((meanLat * Math.PI) / 180) || 1;
  const length = Math.sqrt((perpLon * cosLat) ** 2 + perpLat ** 2) || 1;
  const ux = perpLon / length;
  const uy = perpLat / length;
  return latlngs.map(p => [p[0] + uy * offsetDeg, p[1] + ux * offsetDeg]);
}

/* ─────────────────────────────────────────────
   Status colors for markers
───────────────────────────────────────────── */
const STATUS_COLOR = {
  'service-change': '#ef4444',
  'delay':          '#f59e0b',
  'good':           '#22c55e',
};
const STATUS_PRIORITY = { 'service-change': 2, 'delay': 1, 'good': 0 };

function stationWorstStatus(station, statusByLine) {
  let worst = 'good';
  for (const line of (station.lines || [])) {
    const s = statusByLine[line] || 'good';
    if (STATUS_PRIORITY[s] > STATUS_PRIORITY[worst]) worst = s;
  }
  return worst;
}

/* ─────────────────────────────────────────────
   Map click-away helper
   Uses a ref-based guard so marker clicks that
   set a station don't immediately get cleared.
───────────────────────────────────────────── */
function MapClickAway({ onClickAway, justSelectedRef }) {
  useMapEvents({
    click: () => {
      if (justSelectedRef.current) {
        justSelectedRef.current = false;
        return;
      }
      onClickAway();
    }
  });
  return null;
}

/* ─────────────────────────────────────────────
   LINE GROUPS for filter panel
───────────────────────────────────────────── */
const LINE_GROUPS = [
  { label: 'Red',          lines: ['1','2','3'],              color: '#EE352E' },
  { label: 'Green',        lines: ['4','5','6','G'],          color: '#00933C' },
  { label: 'Purple',       lines: ['7'],                      color: '#B933AD' },
  { label: 'Blue',         lines: ['A','C','E'],              color: '#0039A6' },
  { label: 'Orange',       lines: ['B','D','F','M'],          color: '#FF6319' },
  { label: 'Yellow',       lines: ['N','Q','R','W'],          color: '#FCCC0A' },
  { label: 'Brown',        lines: ['J','Z'],                  color: '#996633' },
  { label: 'Gray',         lines: ['L','S','GS','FS','H'],    color: '#A7A9AC' },
  { label: 'SI',           lines: ['SI'],                     color: '#118844' },
];

function groupForLine(lineId) {
  return LINE_GROUPS.find(g => g.lines.includes(lineId));
}

/* ─────────────────────────────────────────────
   ARRIVAL ITEM
───────────────────────────────────────────── */
function ArrivalRow({ arrival, lineColors }) {
  const colors = lineColors[arrival.line] || { bg: 'bg-gray-600', text: 'text-white', hex: '#888' };
  const mins   = arrival.minutes;
  const isNow  = mins === 0;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0">
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
        style={{ backgroundColor: colors.hex, color: colors.text?.includes('black') ? '#000' : '#fff' }}
      >
        {arrival.line}
      </span>
      <div className="flex items-center gap-1 text-xs text-gray-400">
        {arrival.direction === 'Uptown'
          ? <ArrowUp className="w-3 h-3 text-sky-400" />
          : <ArrowDown className="w-3 h-3 text-orange-400" />
        }
        <span>{arrival.direction}</span>
      </div>
      <div className="ml-auto font-mono font-medium text-sm tracking-tight"
           style={{ fontFamily: "'DM Mono', monospace" }}>
        {isNow
          ? <span className="text-green-400 animate-pulse">NOW</span>
          : <span className="text-white">{mins}<span className="text-gray-500 text-xs ml-0.5">min</span></span>
        }
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STATION PANEL (right side)
───────────────────────────────────────────── */
function StationPanel({ station, lineColors, onClose, onGetArrivals }) {
  const [arrivals, setArrivals]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    if (!station) return;
    setLoading(true);
    setArrivals(null);
    setError(null);
    onGetArrivals(station.id)
      .then(data => setArrivals(data?.arrivals || []))
      .catch(() => setError('Could not load arrivals.'))
      .finally(() => setLoading(false));
  }, [station?.id]);

  if (!station) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        height: '100%',
        width: '300px',
        zIndex: 1000,
        background: 'rgba(10,10,12,0.95)',
        backdropFilter: 'blur(12px)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        fontFamily: "'Barlow Condensed', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.22s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-start justify-between gap-2">
          <h2
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '1.2rem',
              lineHeight: 1.15,
              color: '#fff',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              flex: 1,
            }}
          >
            {station.name}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: 'none',
              borderRadius: '6px',
              color: '#aaa',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Line badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {(station.lines || []).map(line => {
            const c = lineColors[line];
            if (!c) return null;
            return (
              <span
                key={line}
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
                style={{ backgroundColor: c.hex, color: c.text?.includes('black') ? '#000' : '#fff' }}
              >
                {line}
              </span>
            );
          })}
          {station.accessible && (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}
            >
              <Accessibility className="w-3 h-3" />
              ADA
            </span>
          )}
        </div>
      </div>

      {/* Arrivals */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
        <p
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600,
            fontSize: '0.65rem',
            letterSpacing: '0.12em',
            color: '#666',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}
        >
          Next Arrivals
        </p>

        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        )}

        {error && !loading && (
          <p className="text-red-400 text-xs text-center py-4">{error}</p>
        )}

        {arrivals && arrivals.length === 0 && !loading && (
          <p className="text-gray-500 text-xs text-center py-4">No arrivals found.</p>
        )}

        {arrivals && arrivals.map((a, i) => (
          <ArrivalRow key={i} arrival={a} lineColors={lineColors} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LEFT FILTER PANEL
───────────────────────────────────────────── */
function FilterPanel({ hiddenGroups, onToggleGroup, serviceStatus }) {
  const alertCount   = serviceStatus.filter(s => s.status === 'delay').length;
  const changedCount = serviceStatus.filter(s => s.status === 'service-change').length;

  return (
    <div
      style={{
        position: 'absolute',
        top: '14px',
        left: '14px',
        zIndex: 1000,
        width: '200px',
        background: 'rgba(10,10,12,0.92)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '14px',
        fontFamily: "'Barlow Condensed', sans-serif",
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <Train className="w-3.5 h-3.5 text-gray-400" />
        <span style={{ fontSize: '0.6rem', letterSpacing: '0.14em', color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>
          Lines
        </span>
      </div>

      {/* Line group toggles */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {LINE_GROUPS.map(group => {
          const active = !hiddenGroups.has(group.label);
          return (
            <button
              key={group.label}
              onClick={() => onToggleGroup(group.label)}
              style={{
                background: active ? group.color : 'rgba(255,255,255,0.06)',
                color: active ? (group.color === '#FCCC0A' ? '#000' : '#fff') : '#555',
                border: `1px solid ${active ? group.color : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '20px',
                padding: '3px 9px',
                fontSize: '0.72rem',
                fontWeight: 600,
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: '0.04em',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {group.label}
            </button>
          );
        })}
      </div>

      {/* Status legend */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '10px' }}>
        <span style={{ fontSize: '0.6rem', letterSpacing: '0.14em', color: '#666', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
          Status
        </span>
        {[
          { label: 'Good Service', color: '#22c55e', count: serviceStatus.filter(s => s.status === 'good').length },
          { label: 'Delays',       color: '#f59e0b', count: alertCount },
          { label: 'Suspended',    color: '#ef4444', count: changedCount },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2 mb-1.5">
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0, boxShadow: `0 0 6px ${item.color}88` }} />
            <span style={{ fontSize: '0.75rem', color: '#aaa', flex: 1 }}>{item.label}</span>
            {item.count > 0 && (
              <span style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", color: item.color, fontWeight: 500 }}>
                {item.count}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function MapView({
  stations = [],
  serviceStatus = [],
  lineColors = {},
  routePolylines = [],
  onGetArrivals,
}) {
  const [selectedStation, setSelectedStation] = useState(null);
  const [hiddenGroups, setHiddenGroups]       = useState(new Set());
  const justSelectedRef = useRef(false);

  // Map defaults
  const center = [40.7527, -73.9772];
  const zoom   = 12;

  // Build status lookup
  const statusByLine = {};
  serviceStatus.forEach(s => { statusByLine[s.id] = s.status; });

  // Toggle a line group's visibility
  const toggleGroup = useCallback((label) => {
    setHiddenGroups(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }, []);

  // Filter polylines by hidden groups
  const visiblePolylines = routePolylines.filter(r => {
    const group = groupForLine(r.id);
    return !group || !hiddenGroups.has(group.label);
  });

  // Render order: gray/brown first, then blue, green, purple, yellow, orange, red last
  // This ensures high-visibility MTA colors sit on top where tracks overlap
  const GROUP_ORDER = ['Gray','Brown','Blue','Green','Purple','Staten Island','Yellow','Orange','Red'];
  const renderedPolylines = [...visiblePolylines]
    .sort((a, b) => {
      const ai = GROUP_ORDER.indexOf(groupForLine(a.id)?.label ?? '');
      const bi = GROUP_ORDER.indexOf(groupForLine(b.id)?.label ?? '');
      return (ai === -1 ? 0 : ai) - (bi === -1 ? 0 : bi);
    })
    .map(p => ({ poly: p, latlngs: p.coordinates || [], weight: 4 }));

  // CartoDB Positron — clean light tiles, streets visible, no API key needed
  const tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
  const tileAttr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  return (
    <>
      {/* Inject fonts */}
      <style>{FONT_STYLE}</style>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
        .leaflet-container { background: #e8e0d8 !important; }
      `}</style>

      <div
        style={{
          position: 'relative',
          height: 'calc(100vh - 180px)',
          minHeight: '520px',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* ── Map ── */}
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer url={tileUrl} attribution={tileAttr} />
          <MapClickAway onClickAway={() => setSelectedStation(null)} justSelectedRef={justSelectedRef} />

          {/* Route polylines */}
          {renderedPolylines.map(({ poly, latlngs, weight }, i) => {
            const c = lineColors[poly.id];
            return (
              <Polyline
                key={`${poly.id}-${i}`}
                positions={latlngs}
                pathOptions={{
                  color:   c?.hex || '#888',
                  weight,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            );
          })}

          {/* Station markers */}
          {stations.map(station => {
            const worstStatus = stationWorstStatus(station, statusByLine);
            const color       = STATUS_COLOR[worstStatus];
            const isSelected  = selectedStation?.id === station.id;
            return (
              <CircleMarker
                key={station.id}
                center={[station.lat, station.lon]}
                radius={isSelected ? 9 : 5}
                pathOptions={{
                  color:       isSelected ? '#fff' : 'rgba(255,255,255,0.6)',
                  fillColor:   color,
                  fillOpacity: 1,
                  weight:      isSelected ? 2.5 : 1.5,
                }}
                eventHandlers={{
                  click: () => {
                    justSelectedRef.current = true;
                    setSelectedStation(station);
                  },
                }}
              />
            );
          })}
        </MapContainer>

        {/* ── Left filter panel ── */}
        <FilterPanel
          hiddenGroups={hiddenGroups}
          onToggleGroup={toggleGroup}
          serviceStatus={serviceStatus}
        />

        {/* ── Right station panel ── */}
        {selectedStation && (
          <StationPanel
            station={selectedStation}
            lineColors={lineColors}
            onClose={() => setSelectedStation(null)}
            onGetArrivals={onGetArrivals || (() => Promise.resolve({ arrivals: [] }))}
          />
        )}

        {/* ── Map attribution strip ── */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '24px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
            pointerEvents: 'none',
            zIndex: 999,
          }}
        />
      </div>
    </>
  );
}
