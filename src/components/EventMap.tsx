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
  cultural: { color: '#f59e0b', name: 'Cultural' },
  technical: { color: '#ef4444', name: 'Technical' },
  sports: { color: '#22c55e', name: 'Sports' },
  academic: { color: '#8b5cf6', name: 'Academic' },
  default: { color: '#6b7280', name: 'Other' }
};

const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
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
              <div class="slideshow-container" style="position: relative; margin-bottom: 16px;">
                ${allImages.map((img, idx) => `
                  <div class="slide ${idx === 0 ? 'active' : ''}" style="display: ${idx === 0 ? 'block' : 'none'}; position: relative;">
                    <img src="${img}" alt="${event.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;" />
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 32px; font-weight: bold; text-shadow: 2px 2px 8px rgba(0,0,0,0.8); text-align: center; width: 90%;">
                      ${event.title}
                    </div>
                  </div>
                `).join('')}
                ${allImages.length > 1 ? `
                  <button class="prev" onclick="changeSlide(this, -1)" style="position: absolute; top: 50%; left: 10px; transform: translateY(-50%); background: rgba(0,0,0,0.6); color: white; border: none; padding: 8px 12px; cursor: pointer; border-radius: 4px; z-index: 10;">❮</button>
                  <button class="next" onclick="changeSlide(this, 1)" style="position: absolute; top: 50%; right: 10px; transform: translateY(-50%); background: rgba(0,0,0,0.6); color: white; border: none; padding: 8px 12px; cursor: pointer; border-radius: 4px; z-index: 10;">❯</button>
                ` : ''}
              </div>
            `
            : '';
          
          const marker = L.marker([event.location_lat, event.location_lng], {
            icon: createCustomIcon(categoryStyle.color)
          })
            .addTo(mapInstanceRef.current!)
            .bindPopup(`
              <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 320px; max-width: 380px;">
                <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 16px 0; color: #1a1a1a;">${event.title}</h3>
                ${imageSlideshow}
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px;">Time:</div>
                  <div style="font-size: 14px; color: #666;">${new Date(event.start_date).toLocaleString('en-US', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}</div>
                </div>
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px;">Organizer:</div>
                  <div style="font-size: 14px; color: #666;">${event.organizer}</div>
                </div>
                <p style="font-size: 14px; color: #333; margin-bottom: 16px; line-height: 1.5;">${event.description}</p>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${event.event_link ? `
                    <a href="${event.event_link}" target="_blank" style="background: #3b82f6; color: white; text-align: center; padding: 10px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">Register</a>
                  ` : ''}
                  <a href="https://www.google.com/maps/dir/?api=1&destination=${event.location_lat},${event.location_lng}" target="_blank" style="background: #22c55e; color: white; text-align: center; padding: 10px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">Get Directions</a>
                  <button onclick="alert('Save feature coming soon!')" style="background: #f59e0b; color: white; text-align: center; padding: 10px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; font-size: 14px; width: 100%;">Save Event</button>
                </div>
              </div>
            `, { maxWidth: 400, minWidth: 340 })
            .bindTooltip(event.title, {
              permanent: true,
              direction: 'top',
              offset: [0, -35],
              className: 'event-label',
              opacity: 0.9
            });

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
      <style>{`
        .custom-marker {
          background: transparent;
          border: none;
        }
        .event-label {
          background: white !important;
          border: 2px solid #333 !important;
          border-radius: 4px !important;
          padding: 4px 8px !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          color: #1a1a1a !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
          white-space: nowrap !important;
        }
        .event-label::before {
          display: none !important;
        }
        .leaflet-popup-content-wrapper {
          padding: 16px;
          border-radius: 12px;
        }
        .leaflet-popup-content {
          margin: 0;
        }
      `}</style>
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