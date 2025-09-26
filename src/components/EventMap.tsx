import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Event {
  id: string;
  title: string;
  description: string;
  organizer: string;
  category: string;
  location_lat: number;
  location_lng: number;
  start_date: string;
  poster_url?: string;
  status: string;
}

interface EventMapProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  onLocationPick?: (lat: number, lng: number) => void;
  isPickingLocation?: boolean;
}

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const categoryStyles = {
  cultural: { color: '#f59e0b' },
  technical: { color: '#3b82f6' },
  sports: { color: '#22c55e' },
  academic: { color: '#8b5cf6' },
  default: { color: '#6b7280' }
};

const EventMap: React.FC<EventMapProps> = ({ 
  events, 
  onEventClick, 
  onLocationPick, 
  isPickingLocation = false 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // LPU Campus coordinates
      const lpuCampus: [number, number] = [31.2555, 75.7030];
      
      mapInstanceRef.current = L.map(mapRef.current).setView(lpuCampus, 16);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Add click handler for location picking
      mapInstanceRef.current.on('click', (e) => {
        if (isPickingLocation && onLocationPick) {
          onLocationPick(e.latlng.lat, e.latlng.lng);
        }
      });

      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 100);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current) {
      // Clear existing markers
      markersRef.current.forEach(marker => {
        mapInstanceRef.current?.removeLayer(marker);
      });
      markersRef.current = [];

      // Add new markers for events
      events.forEach((event) => {
        if (event.location_lat && event.location_lng) {
          const categoryStyle = categoryStyles[event.category as keyof typeof categoryStyles] || categoryStyles.default;
          
          const marker = L.marker([event.location_lat, event.location_lng])
            .addTo(mapInstanceRef.current!)
            .bindPopup(`
              <div class="p-3 min-w-[280px]">
                <h3 class="font-bold text-lg mb-2">${event.title}</h3>
                <p class="text-sm text-gray-600 mb-2">by ${event.organizer}</p>
                <p class="text-sm mb-2">${new Date(event.start_date).toLocaleDateString()}</p>
                <div class="flex gap-2 mt-3">
                  <button 
                    onclick="handleEventRegister('${event.id}')" 
                    class="bg-primary hover:bg-primary/90 text-white px-3 py-1 rounded text-sm"
                  >
                    Register
                  </button>
                  <button 
                    onclick="handleEventSave('${event.id}')" 
                    class="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-1 rounded text-sm"
                  >
                    Save
                  </button>
                </div>
              </div>
            `, { maxWidth: 300 });

          markersRef.current.push(marker);

          if (onEventClick) {
            marker.on('click', () => onEventClick(event));
          }
        }
      });
    }
  }, [events, onEventClick]);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.style.cursor = isPickingLocation ? 'crosshair' : 'grab';
    }
  }, [isPickingLocation]);

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '400px' }}
      />
      {isPickingLocation && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center pointer-events-none">
          <div className="bg-card p-4 rounded-lg shadow-lg">
            <p className="text-card-foreground font-semibold">
              Click on the map to select event location
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventMap;