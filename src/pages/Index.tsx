import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Settings, User, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EventMap from '@/components/EventMap';
import EventList from '@/components/EventList';
import AddEventModal from '@/components/AddEventModal';
import AdminPanel from '@/components/AdminPanel';

interface Event {
  id: string;
  title: string;
  description: string;
  organizer: string;
  category: string;
  location_lat: number;
  location_lng: number;
  start_date: string;
  end_date?: string;
  poster_url?: string;
  image_urls?: string[];
  event_link?: string;
  status: string;
  created_at: string;
  created_by?: string;
}

interface User {
  id: string;
  email?: string;
}

const Index = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'all' | 'saved'>('all');
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number; lng: number} | null>(null);
  const [isPickingLocation, setIsPickingLocation] = useState(false);

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    // Load saved events from localStorage
    const saved = localStorage.getItem('savedLpuEvents');
    if (saved) {
      setSavedEventIds(JSON.parse(saved));
    }

    fetchApprovedEvents();

    return () => subscription.unsubscribe();
  }, []);

  const fetchApprovedEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'approved')
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load events.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEventSubmit = async (eventData: any) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit events.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .insert([{
          ...eventData,
          created_by: user.id,
          status: 'pending'
        }]);

      if (error) throw error;

      toast({
        title: "Event Submitted",
        description: "Your event has been submitted for approval.",
      });

      setSelectedLocation(null);
    } catch (error) {
      console.error('Error submitting event:', error);
      throw error;
    }
  };

  const handleRegister = async (eventId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to register for events.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('event_registrations')
        .insert([{
          event_id: eventId,
          user_id: user.id
        }]);

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Already Registered",
            description: "You are already registered for this event.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Registration Successful",
          description: "You have been registered for the event.",
        });
      }
    } catch (error) {
      console.error('Error registering for event:', error);
      toast({
        title: "Registration Failed",
        description: "Failed to register for the event.",
        variant: "destructive"
      });
    }
  };

  const handleSaveToggle = (eventId: string) => {
    const newSavedIds = savedEventIds.includes(eventId)
      ? savedEventIds.filter(id => id !== eventId)
      : [...savedEventIds, eventId];
    
    setSavedEventIds(newSavedIds);
    localStorage.setItem('savedLpuEvents', JSON.stringify(newSavedIds));
    
    toast({
      title: savedEventIds.includes(eventId) ? "Event Unsaved" : "Event Saved",
      description: savedEventIds.includes(eventId) 
        ? "Event removed from your saved list." 
        : "Event added to your saved list.",
    });
  };

  const handleGetDirections = (lat: number, lng: number) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const url = `https://www.google.com/maps/dir/${latitude},${longitude}/${lat},${lng}`;
          window.open(url, '_blank');
        },
        () => {
          const url = `https://www.google.com/maps/dir//${lat},${lng}`;
          window.open(url, '_blank');
        }
      );
    } else {
      const url = `https://www.google.com/maps/dir//${lat},${lng}`;
      window.open(url, '_blank');
    }
  };

  const handleLocationPick = () => {
    setIsPickingLocation(true);
    setShowAddEventModal(false);
  };

  const handleLocationSelected = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setIsPickingLocation(false);
    setShowAddEventModal(true);
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSelectedLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          toast({
            title: "Location Set",
            description: "Current location has been set for the event.",
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast({
            title: "Location Error",
            description: "Failed to get your current location.",
            variant: "destructive"
          });
        }
      );
    } else {
      toast({
        title: "Not Supported",
        description: "Geolocation is not supported by your browser.",
        variant: "destructive"
      });
    }
  };

  const handleLogin = () => {
    // Redirect to auth page
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-1/3 lg:w-1/4 p-4 bg-card shadow-lg overflow-y-auto flex flex-col z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            LPU Events
          </h1>
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdminPanel(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogin}
            >
              <LogIn className="w-4 h-4" />
            </Button>
          )}
        </div>

        <EventList
          events={events}
          savedEventIds={savedEventIds}
          onRegister={handleRegister}
          onSaveToggle={handleSaveToggle}
          onGetDirections={handleGetDirections}
          currentView={currentView}
          onViewChange={setCurrentView}
        />

        <div className="mt-4 space-y-2">
          <Button 
            onClick={() => setShowAddEventModal(true)}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Event
          </Button>
          
          {user && (
            <Button 
              onClick={() => setShowAdminPanel(true)}
              className="w-full bg-secondary hover:bg-secondary/80"
            >
              <Settings className="w-4 h-4 mr-2" />
              Admin Panel
            </Button>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-grow relative z-0">
        <EventMap
          events={events}
          isPickingLocation={isPickingLocation}
          onLocationPick={handleLocationSelected}
        />
      </div>

      {/* Modals */}
      <AddEventModal
        isOpen={showAddEventModal}
        onClose={() => setShowAddEventModal(false)}
        onSubmit={handleEventSubmit}
        onLocationPick={handleLocationPick}
        onUseCurrentLocation={handleUseCurrentLocation}
        selectedLocation={selectedLocation}
      />

      {user && (
        <AdminPanel
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
        />
      )}
    </div>
  );
};

export default Index;
