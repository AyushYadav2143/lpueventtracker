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
  image_urls?: string[];
  event_link?: string;
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

  // Handle location picking separately
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isPickingLocation && onLocationPick) {
        onLocationPick(e.latlng.lat, e.latlng.lng);
      }
    };

    mapInstanceRef.current.on('click', handleMapClick);

    return () => {
      mapInstanceRef.current?.off('click', handleMapClick);
    };
  }, [isPickingLocation, onLocationPick]);

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
          
          // Create image slideshow HTML
          const allImages = [
            event.poster_url,
            ...(event.image_urls || [])
          ].filter(Boolean);

          const imageSlideshow = allImages.length > 0 
            ? `
              <div class="slideshow-container mb-3">
                ${allImages.map((img, idx) => `
                  <div class="slide ${idx === 0 ? 'active' : ''}" style="display: ${idx === 0 ? 'block' : 'none'}">
                    <img src="${img}" alt="${event.title}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px;" />
                  </div>
                `).join('')}
                ${allImages.length > 1 ? `
                  <button class="prev" onclick="changeSlide(this, -1)" style="position: absolute; top: 50%; left: 10px; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; padding: 8px 12px; cursor: pointer; border-radius: 4px;">❮</button>
                  <button class="next" onclick="changeSlide(this, 1)" style="position: absolute; top: 50%; right: 10px; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; padding: 8px 12px; cursor: pointer; border-radius: 4px;">❯</button>
                ` : ''}
              </div>
            `
            : '';
          
          const marker = L.marker([event.location_lat, event.location_lng])
            .addTo(mapInstanceRef.current!)
            .bindPopup(`
              <div class="p-3 min-w-[320px] max-w-[400px]" style="position: relative;">
                ${imageSlideshow}
                <h3 class="font-bold text-lg mb-2">${event.title}</h3>
                <p class="text-sm text-gray-600 mb-1">by ${event.organizer}</p>
                <p class="text-sm text-gray-500 mb-2">${new Date(event.start_date).toLocaleDateString()}</p>
                <p class="text-sm mb-3">${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}</p>
                ${event.event_link ? `
                  <a href="${event.event_link}" target="_blank" class="text-primary hover:underline text-sm block mb-2">View Event Details →</a>
                ` : ''}
              </div>
            `, { maxWidth: 400, minWidth: 320 });

          markersRef.current.push(marker);

          if (onEventClick) {
            marker.on('click', () => onEventClick(event));
          }
        }
      });

      // Add slideshow navigation function to window
      if (!('changeSlide' in window)) {
        (window as any).changeSlide = function(btn: HTMLElement, direction: number) {
          const container = btn.closest('.slideshow-container');
          if (!container) return;
          
          const slides = container.querySelectorAll('.slide');
          let currentIndex = Array.from(slides).findIndex(slide => 
            (slide as HTMLElement).style.display === 'block'
          );
          
          slides[currentIndex].setAttribute('style', 'display: none;');
          currentIndex = (currentIndex + direction + slides.length) % slides.length;
          slides[currentIndex].setAttribute('style', 'display: block;');
        };
      }
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