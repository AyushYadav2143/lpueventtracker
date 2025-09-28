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
    // Check for admin session first
    const adminSession = localStorage.getItem('adminSession');
    const adminEmail = localStorage.getItem('adminEmail');
    
    if (adminSession === 'true' && adminEmail) {
      setUser({ id: 'admin', email: adminEmail });
      setShowAdminPanel(true); // Automatically open admin panel for admin login
    } else {
      // Check regular Supabase auth state
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      });
    }

    // Listen for auth changes (preserve admin session if active)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          // Regular user signed in: clear admin session and set user
          localStorage.removeItem('adminSession');
          localStorage.removeItem('adminEmail');
          setUser(session.user);
          setShowAdminPanel(false);
          return;
        }
        // No Supabase session; preserve admin session if present
        const isAdminSession = localStorage.getItem('adminSession') === 'true';
        const adminEmail = localStorage.getItem('adminEmail');
        if (isAdminSession && adminEmail) {
          setUser({ id: 'admin', email: adminEmail });
          setShowAdminPanel(true);
        } else {
          setUser(null);
        }
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

  const handleLogout = async () => {
    const isAdmin = localStorage.getItem('adminSession') === 'true';
    
    if (isAdmin) {
      // Clear admin session
      localStorage.removeItem('adminSession');
      localStorage.removeItem('adminEmail');
      setUser(null);
    } else {
      // Regular user logout
      await supabase.auth.signOut();
    }
    
    toast({
      title: "Signed Out",
      description: "You have been signed out successfully.",
    });
  };

  const isAdmin = () => {
    return localStorage.getItem('adminSession') === 'true';
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
            <div className="flex gap-2">
              {isAdmin() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdminPanel(true)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
              >
                <User className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogin}
              >
                <LogIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { window.location.href = '/auth#admin'; }}
                aria-label="Admin login"
              >
                Admin
              </Button>
            </div>
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
          
          {user && isAdmin() && (
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

      {user && isAdmin() && (
        <AdminPanel
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
        />
      )}
    </div>
  );
};

export default Index;
