import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Settings, User, LogIn, Menu, Linkedin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EventMap from '@/components/EventMap';
import EventList from '@/components/EventList';
import AddEventModal from '@/components/AddEventModal';
import AdminPanel from '@/components/AdminPanel';
import { useNavigate } from 'react-router-dom';
import vibelpu from '@/assets/vibelpu-logo.png';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

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
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'all' | 'saved'>('all');
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number; lng: number} | null>(null);
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  useEffect(() => {
    // Check for current user from localStorage
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
      try {
        const currentUser = JSON.parse(currentUserStr);
        setUser({ id: currentUser.id, email: currentUser.email });
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }

    // Load saved events from localStorage
    const saved = localStorage.getItem('savedLpuEvents');
    if (saved) {
      setSavedEventIds(JSON.parse(saved));
    }

    fetchApprovedEvents();
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
    try {
      const startDate = eventData.start_date;
      const endDate = eventData.end_date && String(eventData.end_date).trim() !== ''
        ? eventData.end_date
        : startDate;

      const payload = {
        ...eventData,
        start_date: startDate,
        end_date: endDate,
        event_link: eventData.event_link?.trim() ? eventData.event_link.trim() : null,
      };

      const { data, error } = await supabase.functions.invoke('submit-event', {
        body: payload,
      });

      if (error) throw error;

      toast({
        title: "Event Submitted",
        description: "Your event has been submitted for admin approval.",
      });

      setSelectedLocation(null);
    } catch (error) {
      console.error('Error submitting event:', error);
      toast({
        title: "Submission Failed",
        description: "Could not submit your event. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleRegister = async (eventId: string) => {
    toast({
      title: "Event Registration",
      description: "Please contact the event organizer directly to register.",
    });
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
  navigate('/auth');
};

  const handleLogout = async () => {
    localStorage.removeItem('currentUser');
    setUser(null);
    
    toast({
      title: "Signed Out",
      description: "You have been signed out successfully.",
    });
  };

  const isAdmin = () => {
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) return false;
    try {
      const currentUser = JSON.parse(currentUserStr);
      return currentUser.isAdmin === true || currentUser.type === 'admin';
    } catch {
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:flex w-full md:w-1/3 lg:w-1/4 p-4 bg-card shadow-lg overflow-y-auto flex-col z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <img src={vibelpu} alt="vibelpu logo" className="h-10 w-10 object-contain" />
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                vibelpu
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://www.linkedin.com/in/vibelpu/', '_blank')}
              className="w-fit"
            >
              <Linkedin className="w-3 h-3 mr-1" />
              LinkedIn
            </Button>
          </div>
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
                onClick={() => { navigate('/auth?tab=admin'); }}
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

      {/* Mobile Floating Button */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetTrigger asChild>
          <Button
            className="md:hidden fixed top-4 left-4 z-50 shadow-lg bg-primary hover:bg-primary/90"
            size="icon"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[85vw] sm:w-[400px] p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <img src={vibelpu} alt="vibelpu logo" className="h-10 w-10 object-contain" />
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  vibelpu
                </h1>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://www.linkedin.com/in/vibelpu/', '_blank')}
                className="w-fit"
              >
                <Linkedin className="w-3 h-3 mr-1" />
                LinkedIn
              </Button>
            </div>
            {user ? (
              <div className="flex gap-2">
                {isAdmin() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAdminPanel(true);
                      setMobileSheetOpen(false);
                    }}
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
                  onClick={() => { navigate('/auth?tab=admin'); }}
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
              onClick={() => {
                setShowAddEventModal(true);
                setMobileSheetOpen(false);
              }}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Event
            </Button>
            
            {user && isAdmin() && (
              <Button 
                onClick={() => {
                  setShowAdminPanel(true);
                  setMobileSheetOpen(false);
                }}
                className="w-full bg-secondary hover:bg-secondary/80"
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin Panel
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Map */}
      <div className="flex-grow relative z-0 h-screen md:h-auto">
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
          onEventStatusChange={fetchApprovedEvents}
        />
      )}
    </div>
  );
};

export default Index;
