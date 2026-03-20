/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, useMapEvents } from 'react-leaflet';
import { MapPin, Navigation, Search, Layers, Settings, Compass, Crosshair, User as UserIcon, LogIn } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LoginWithSanscounts } from './components/LoginWithSanscounts';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom sky marker icon
const customIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function LocationMarker({ triggerLocate }: { triggerLocate: number }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMap();

  useEffect(() => {
    map.locate().on("locationfound", function (e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    });
  }, [map, triggerLocate]);

  return position === null ? null : (
    <Marker position={position} icon={customIcon}>
      <Popup>
        <div className="font-sans text-xs">
          <p className="font-bold text-sky-600 mb-1">CURRENT LOCATION</p>
          <p>LAT: {position.lat.toFixed(4)}</p>
          <p>LNG: {position.lng.toFixed(4)}</p>
        </div>
      </Popup>
    </Marker>
  );
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [triggerLocate, setTriggerLocate] = useState(0);
  const [mapCenter, setMapCenter] = useState<[number, number]>([23.8103, 90.4125]); // Default to Dhaka
  const [mapZoom, setMapZoom] = useState(13);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showLoginOptions, setShowLoginOptions] = useState(false);

  // Initial location detection
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
          setMapZoom(15);
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
    }
  }, []);

  const handleLocateClick = () => {
    setTriggerLocate(prev => prev + 1);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data);
      setShowResults(true);
      
      if (data && data.length > 0) {
        const firstResult = data[0];
        setMapCenter([parseFloat(firstResult.lat), parseFloat(firstResult.lon)]);
        setMapZoom(14);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectResult = (result: any) => {
    setMapCenter([parseFloat(result.lat), parseFloat(result.lon)]);
    setMapZoom(15);
    setSearchQuery(result.display_name);
    setShowResults(false);
  };

  // Component to handle map view updates
  function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
      map.flyTo(center, zoom);
    }, [center, zoom, map]);
    return null;
  }

  function MapEvents() {
    useMapEvents({
      move: (e) => {
        const map = e.target;
        setMapCenter([map.getCenter().lat, map.getCenter().lng]);
      }
    });
    return null;
  }

  return (
    <div className="h-screen w-full bg-sky-50 text-sky-900 font-sans flex flex-col overflow-hidden relative">
      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none flex justify-between items-start">
        
        {/* Logo & Search */}
        <div className="flex flex-col gap-4 pointer-events-auto w-full max-w-md">
          <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md border border-sky-100 p-3 rounded-2xl shadow-xl">
            <div className="bg-sky-100 p-2 rounded-xl border border-sky-200">
              <Compass className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-widest text-sky-950 uppercase">Sans Map</h1>
              <p className="text-[10px] text-sky-400 uppercase tracking-[0.2em]">Sky Protocol v2</p>
            </div>
          </div>

          <div className="relative">
            <form onSubmit={handleSearch} className="flex items-center gap-3 bg-white/90 backdrop-blur-md border border-sky-100 p-2 rounded-2xl shadow-xl focus-within:border-sky-400 transition-colors">
              <Search className={`w-5 h-5 ml-2 ${isSearching ? 'text-sky-500 animate-pulse' : 'text-sky-300'}`} />
              <input 
                type="text" 
                placeholder="Search for a place..." 
                className="bg-transparent border-none outline-none text-sky-900 placeholder-sky-200 w-full text-sm font-sans"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowResults(true);
                }}
              />
            </form>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-sky-100 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
                {searchResults.map((result, idx) => (
                  <div 
                    key={idx} 
                    className="p-3 border-b border-sky-50 hover:bg-sky-50 cursor-pointer transition-colors text-xs text-sky-900"
                    onClick={() => selectResult(result)}
                  >
                    {result.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex flex-col items-end gap-3 pointer-events-auto">
          {!user ? (
            <div className="relative">
              <button 
                onClick={() => setShowLoginOptions(!showLoginOptions)}
                className="bg-white/90 backdrop-blur-md border border-sky-100 p-3 rounded-2xl shadow-xl hover:bg-sky-50 transition-colors text-sky-600 hover:text-sky-800 group flex items-center gap-2"
              >
                <LogIn className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-wider">Login</span>
              </button>
              
              {showLoginOptions && (
                <div className="absolute top-full right-0 mt-2 w-64 z-[1100] animate-in fade-in slide-in-from-top-2 duration-200">
                  <LoginWithSanscounts onLoginSuccess={(u) => {
                    setUser(u);
                    setShowLoginOptions(false);
                  }} />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-md border border-sky-100 p-2 pr-4 rounded-full shadow-xl flex items-center gap-3">
              <img src={user.avatar || "https://i.postimg.cc/wvXS9k1D/IMG-9128.jpg"} alt={user.name || 'User'} className="w-8 h-8 rounded-full object-cover border border-sky-200" referrerPolicy="no-referrer" />
              <span className="text-sky-700 font-bold text-sm">{user.name || 'User'}</span>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <button className="bg-white/90 backdrop-blur-md border border-sky-100 p-3 rounded-2xl shadow-xl hover:bg-sky-50 transition-colors text-sky-600 hover:text-sky-800 group self-end">
              <Layers className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            <button className="bg-white/90 backdrop-blur-md border border-sky-100 p-3 rounded-2xl shadow-xl hover:bg-sky-50 transition-colors text-sky-600 hover:text-sky-800 group self-end">
              <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 w-full h-full relative z-0" onClick={() => setShowResults(false)}>
        <MapContainer 
          center={mapCenter} 
          zoom={mapZoom} 
          zoomControl={false}
          className="w-full h-full bg-sky-50"
        >
          <MapUpdater center={mapCenter} zoom={mapZoom} />
          <MapEvents />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <ZoomControl position="bottomright" />
          <LocationMarker triggerLocate={triggerLocate} />
        </MapContainer>
        
        {/* Center Crosshair */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[400] opacity-30">
          <Crosshair className="w-6 h-6 text-sky-500" />
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-8 left-8 right-8 z-[1000] pointer-events-none flex justify-between items-end">
        <button 
          className="bg-sky-600/90 backdrop-blur-md border border-sky-400 p-4 rounded-full shadow-lg hover:bg-sky-700 transition-all text-white group pointer-events-auto"
          onClick={handleLocateClick}
          title="Find My Location"
        >
          <Navigation className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>

        {/* Coordinates Display */}
        <div className="bg-white/90 backdrop-blur-md border border-sky-100 px-4 py-2 rounded-xl shadow-xl text-xs text-sky-700 flex gap-4 pointer-events-auto">
          <div>
            <span className="text-sky-300 mr-2 uppercase font-bold">Lat</span>
            {mapCenter[0].toFixed(6)}
          </div>
          <div>
            <span className="text-sky-300 mr-2 uppercase font-bold">Lng</span>
            {mapCenter[1].toFixed(6)}
          </div>
        </div>
      </div>
      
      {/* Decorative Grid Overlay (pointer-events-none) */}
      <div className="absolute inset-0 pointer-events-none z-[500] opacity-[0.05]" 
           style={{
             backgroundImage: 'linear-gradient(#0ea5e9 1px, transparent 1px), linear-gradient(90deg, #0ea5e9 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }}>
      </div>
    </div>
  );
}
