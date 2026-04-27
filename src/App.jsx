import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Bus, Train, Car, Search, MapPin, AlertTriangle, ShieldCheck, Navigation } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const LOCATIONS = {
  liet: { name: 'Lords Institute of Engineering and Technology', coords: [17.3615, 78.4023] },
  mehdipatnam: { name: 'Mehdipatnam', coords: [17.3916, 78.4400] },
  gachibowli: { name: 'Gachibowli', coords: [17.4401, 78.3489] },
  tolichowki: { name: 'Tolichowki', coords: [17.3986, 78.4144] },
};

// Mock data for transit hubs
const TRANSIT_HUBS = [
  { type: 'bus', coords: [17.3916, 78.4400], name: 'Mehdipatnam Bus Stop' },
  { type: 'bus', coords: [17.3986, 78.4144], name: 'Tolichowki Bus Stop' },
  { type: 'bus', coords: [17.3821, 78.4000], name: 'Attapur Bus Stop' },
  { type: 'metro', coords: [17.4401, 78.3489], name: 'Gachibowli Metro (Proposed)' },
  { type: 'shared', coords: [17.3750, 78.4050], name: 'Sun City Auto Stand' },
];

// Mock routes with segments to identify "Walking Unviability Zones"
const ROUTES = {
  mehdipatnam: [
    { start: LOCATIONS.mehdipatnam.coords, end: LOCATIONS.tolichowki.coords, viable: true, distance: 3.2 },
    { start: LOCATIONS.tolichowki.coords, end: [17.3821, 78.4000], viable: true, distance: 2.5 },
    { start: [17.3821, 78.4000], end: [17.3700, 78.4010], viable: false, distance: 1.5, note: "No direct bus" }, // Unviable
    { start: [17.3700, 78.4010], end: LOCATIONS.liet.coords, viable: false, distance: 1.2, note: "Poor lighting, no auto" }, // Unviable
  ],
  gachibowli: [
    { start: LOCATIONS.gachibowli.coords, end: [17.4200, 78.3800], viable: true, distance: 4.5 },
    { start: [17.4200, 78.3800], end: [17.3900, 78.4000], viable: false, distance: 3.8, note: "Long walk to transit" }, // Unviable
    { start: [17.3900, 78.4000], end: LOCATIONS.liet.coords, viable: true, distance: 3.5 },
  ],
  tolichowki: [
    { start: LOCATIONS.tolichowki.coords, end: [17.3800, 78.4050], viable: true, distance: 2.5 },
    { start: [17.3800, 78.4050], end: LOCATIONS.liet.coords, viable: false, distance: 2.2, note: "Isolated stretch" }, // Unviable
  ]
};

// Component to handle map center updates
const MapCenterUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 13);
  }, [center, map]);
  return null;
};

export default function App() {
  const [selectedStart, setSelectedStart] = useState('mehdipatnam');
  const [filters, setFilters] = useState({
    bus: true,
    metro: true,
    shared: true
  });
  
  const currentRoute = ROUTES[selectedStart];
  
  // Calculate Safety Score
  const calculateSafetyScore = () => {
    if (!currentRoute) return 100;
    const totalDist = currentRoute.reduce((acc, seg) => acc + seg.distance, 0);
    const unviableDist = currentRoute.filter(seg => !seg.viable).reduce((acc, seg) => acc + seg.distance, 0);
    
    // Base score is 100, drops proportionally to unviable distance, with some minimum
    const score = Math.max(10, Math.round(100 - (unviableDist / totalDist) * 100));
    return score;
  };

  const safetyScore = calculateSafetyScore();

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-800">
      
      {/* Sidebar */}
      <div className="w-96 bg-white shadow-xl z-20 flex flex-col h-full shrink-0 border-r border-slate-200">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-pink-600 to-rose-500 text-white shadow-md relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8" />
            Nari-Yatra
          </h1>
          <p className="text-pink-100 text-sm font-medium">Safe Transit Mapping for Women</p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Search Section */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Start Location</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-shadow text-slate-700 font-medium cursor-pointer"
                value={selectedStart}
                onChange={(e) => setSelectedStart(e.target.value)}
              >
                <option value="mehdipatnam">Mehdipatnam</option>
                <option value="gachibowli">Gachibowli</option>
                <option value="tolichowki">Tolichowki</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-2 px-1">
              <Navigation className="w-4 h-4 text-pink-500" />
              <span>To: <strong className="text-slate-700">Lords Institute (LIET)</strong></span>
            </div>
          </div>

          {/* Transport Filters */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Available Transport</label>
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => setFilters(f => ({...f, bus: !f.bus}))}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
                  filters.bus ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                )}
              >
                <Bus className="w-6 h-6 mb-1" />
                <span className="text-xs font-semibold">TSRTC</span>
              </button>
              
              <button 
                onClick={() => setFilters(f => ({...f, metro: !f.metro}))}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
                  filters.metro ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                )}
              >
                <Train className="w-6 h-6 mb-1" />
                <span className="text-xs font-semibold">Metro</span>
              </button>
              
              <button 
                onClick={() => setFilters(f => ({...f, shared: !f.shared}))}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
                  filters.shared ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                )}
              >
                <Car className="w-6 h-6 mb-1" />
                <span className="text-xs font-semibold">Shared</span>
              </button>
            </div>
          </div>

          {/* Safety Gauge */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex justify-between items-center">
              Safety Score
              <span className={cn(
                "text-2xl font-black",
                safetyScore > 75 ? "text-emerald-500" : safetyScore > 40 ? "text-amber-500" : "text-rose-500"
              )}>
                {safetyScore}/100
              </span>
            </h3>
            
            {/* Custom Progress Bar */}
            <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
              <div 
                className={cn(
                  "h-full transition-all duration-1000 ease-out",
                  safetyScore > 75 ? "bg-emerald-500" : safetyScore > 40 ? "bg-amber-500" : "bg-rose-500"
                )}
                style={{ width: safetyScore + '%' }}
              ></div>
            </div>
            
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Score based on transport availability, lighting, and presence of walking unviability zones.
            </p>
          </div>
          
          {/* Legend */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
             <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Map Legend</label>
             <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-1 bg-emerald-500 rounded-full"></div>
                  <span className="text-slate-600">Safe Transit Route</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-1 bg-rose-500 rounded-full border-b-2 border-rose-300 border-dotted"></div>
                  <span className="text-slate-600 font-medium">Walking Unviability Zone</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-pink-600 rounded-full border-2 border-white shadow-sm"></div>
                  <span className="text-slate-600">Destination (LIET)</span>
                </div>
             </div>
          </div>

        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative z-0">
        <MapContainer 
          center={LOCATIONS[selectedStart].coords} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          
          <MapCenterUpdater center={LOCATIONS[selectedStart].coords} />

          {/* Destination Marker */}
          <Marker position={LOCATIONS.liet.coords} icon={createCustomIcon('#db2777')}>
            <Popup className="custom-popup">
              <div className="font-semibold text-slate-800">{LOCATIONS.liet.name}</div>
              <div className="text-xs text-slate-500">Destination</div>
            </Popup>
          </Marker>

          {/* Start Marker */}
          <Marker position={LOCATIONS[selectedStart].coords} icon={createCustomIcon('#3b82f6')}>
            <Popup>
              <div className="font-semibold text-slate-800">{LOCATIONS[selectedStart].name}</div>
              <div className="text-xs text-slate-500">Start Point</div>
            </Popup>
          </Marker>

          {/* Transit Hubs */}
          {TRANSIT_HUBS.map((hub, idx) => {
            if (!filters[hub.type]) return null;
            
            const color = hub.type === 'bus' ? '#3b82f6' : hub.type === 'metro' ? '#10b981' : '#a855f7';
            return (
              <Marker key={idx} position={hub.coords} icon={createCustomIcon(color)}>
                <Popup>
                  <div className="font-medium">{hub.name}</div>
                  <div className="text-xs uppercase text-slate-500">{hub.type} Station</div>
                </Popup>
              </Marker>
            );
          })}

          {/* Route Rendering */}
          {currentRoute?.map((segment, idx) => (
            <React.Fragment key={idx}>
              <Polyline 
                positions={[segment.start, segment.end]} 
                pathOptions={{ 
                  color: segment.viable ? '#10b981' : '#f43f5e', 
                  weight: segment.viable ? 5 : 6,
                  dashArray: segment.viable ? null : '10, 10',
                  opacity: 0.8
                }} 
              />
              {!segment.viable && (
                <Marker 
                  position={[(segment.start[0] + segment.end[0])/2, (segment.start[1] + segment.end[1])/2]}
                  icon={L.divIcon({
                    className: 'bg-transparent border-none',
                    html: `<div class="bg-rose-500 text-white rounded-full p-1 shadow-lg w-8 h-8 flex items-center justify-center border-2 border-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                  })}
                >
                  <Popup>
                    <div className="font-bold text-rose-600 mb-1">Walking Unviability Zone!</div>
                    <div className="text-sm text-slate-700 mb-2">Distance &gt; 1km from nearest transit hub.</div>
                    <div className="bg-rose-50 text-rose-700 px-2 py-1 rounded text-xs font-medium">
                      Note: {segment.note}
                    </div>
                  </Popup>
                </Marker>
              )}
            </React.Fragment>
          ))}
        </MapContainer>
        
        {/* Floating Unviability Alert when a bad route is active */}
        {safetyScore < 60 && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-white px-5 py-3 rounded-full shadow-2xl border-2 border-rose-100 flex items-center gap-3 animate-bounce">
            <div className="bg-rose-100 text-rose-500 p-2 rounded-full">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm">Caution Advised</div>
              <div className="text-xs text-slate-500">Route contains unviable walking zones</div>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
}
