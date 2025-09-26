import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Users, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const Index = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Initialize the map
      mapInstanceRef.current = L.map(mapRef.current).setView([40.7128, -74.0060], 10);
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }

    // Fetch approved events
    fetchApprovedEvents();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const fetchApprovedEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'approved');
      
      if (error) throw error;
      
      setEvents(data || []);
      
      // Add markers to map
      if (mapInstanceRef.current && data) {
        data.forEach((event) => {
          if (event.location_lat && event.location_lng) {
            const marker = L.marker([event.location_lat, event.location_lng])
              .addTo(mapInstanceRef.current!)
              .bindPopup(`
                <div class="p-2">
                  <h3 class="font-bold">${event.title}</h3>
                  <p class="text-sm text-gray-600">${event.organizer}</p>
                  <p class="text-sm">${new Date(event.start_date).toLocaleDateString()}</p>
                </div>
              `);
          }
        });
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Campus Events
              </h1>
              <p className="text-muted-foreground">Discover and manage events on campus</p>
            </div>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <Card className="h-[500px]">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Event Locations
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full p-0">
                <div 
                  ref={mapRef} 
                  className="w-full h-full rounded-b-lg"
                  style={{ minHeight: '400px' }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Events List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Upcoming Events</h2>
            
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : events.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No events found. Be the first to add an event!
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 max-h-[450px] overflow-y-auto">
                {events.map((event) => (
                  <Card key={event.id} className="transition-shadow hover:shadow-medium">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{event.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            by {event.organizer}
                          </p>
                          <div className="flex items-center text-xs text-muted-foreground mb-2">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(event.start_date).toLocaleDateString()}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {event.category}
                          </Badge>
                        </div>
                        <Button variant="outline" size="sm">
                          <Users className="w-3 h-3 mr-1" />
                          Register
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
