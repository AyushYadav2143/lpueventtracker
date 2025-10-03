import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Check, X, BarChart3, Users, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  status: string;
  created_at: string;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onEventStatusChange: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, onEventStatusChange }) => {
  const { toast } = useToast();
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [approvedEvents, setApprovedEvents] = useState<Event[]>([]);
  const [analytics, setAnalytics] = useState({
    totalEvents: 0,
    pendingEvents: 0,
    approvedEvents: 0,
    categoryCounts: {} as Record<string, number>
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchEvents();
      fetchAnalytics();
    }
  }, [isOpen]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated with Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Admin authentication required');
      }
      
      // Fetch pending events
      const { data: pending, error: pendingError } = await supabase.rpc('admin_list_events', {
        _status: 'pending'
      });

      if (pendingError) throw pendingError;

      // Fetch approved events  
      const { data: approved, error: approvedError } = await supabase.rpc('admin_list_events', {
        _status: 'approved'
      });

      if (approvedError) throw approvedError;

      setPendingEvents(pending || []);
      setApprovedEvents(approved || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch events. Please make sure you're logged in as admin.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data: events, error } = await supabase
        .from('events')
        .select('category, status');

      if (error) throw error;

      const totalEvents = events?.length || 0;
      const pendingCount = events?.filter(e => e.status === 'pending').length || 0;
      const approvedCount = events?.filter(e => e.status === 'approved').length || 0;

      const categoryCounts = events?.reduce((acc, event) => {
        acc[event.category] = (acc[event.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      setAnalytics({
        totalEvents,
        pendingEvents: pendingCount,
        approvedEvents: approvedCount,
        categoryCounts
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleApproveEvent = async (eventId: string) => {
    try {
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Admin authentication required');
      }

      const { error } = await supabase.rpc('admin_update_event_status', {
        _event_id: eventId,
        _new_status: 'approved'
      });

      if (error) throw error;

      toast({
        title: "Event Approved",
        description: "The event has been approved successfully.",
        variant: "default"
      });

      fetchEvents();
      fetchAnalytics();
      onEventStatusChange(); // Refresh main event list
    } catch (error) {
      console.error('Error approving event:', error);
      toast({
        title: "Error",
        description: "Failed to approve event. Please ensure you're logged in as admin.",
        variant: "destructive"
      });
    }
  };

  const handleRejectEvent = async (eventId: string) => {
    try {
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Admin authentication required');
      }

      const { error } = await supabase.rpc('admin_delete_event', {
        _event_id: eventId
      });

      if (error) throw error;

      toast({
        title: "Event Rejected",
        description: "The event has been rejected and deleted.",
        variant: "default"
      });

      fetchEvents();
      fetchAnalytics();
      onEventStatusChange(); // Refresh main event list
    } catch (error) {
      console.error('Error rejecting event:', error);
      toast({
        title: "Error",
        description: "Failed to reject event. Please ensure you're logged in as admin.",
        variant: "destructive"
      });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cultural': return 'bg-cultural text-cultural-foreground';
      case 'technical': return 'bg-technical text-technical-foreground';
      case 'sports': return 'bg-sports text-sports-foreground';
      case 'academic': return 'bg-academic text-academic-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const EventCard = ({ event, isPending = false }: { event: Event; isPending?: boolean }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">{event.title}</h3>
              <p className="text-sm text-muted-foreground mb-2">by {event.organizer}</p>
              <div className="flex items-center text-sm text-muted-foreground mb-2">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(event.start_date).toLocaleString()}
              </div>
              <div className="flex items-center text-sm text-muted-foreground mb-2">
                <MapPin className="w-4 h-4 mr-1" />
                {event.location_lat.toFixed(4)}, {event.location_lng.toFixed(4)}
              </div>
              <Badge className={`text-xs ${getCategoryColor(event.category)}`}>
                {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
              </Badge>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {event.description}
          </p>

          <div className="text-xs text-muted-foreground">
            <Clock className="w-3 h-3 mr-1 inline" />
            Submitted: {new Date(event.created_at).toLocaleString()}
          </div>

          {isPending && (
            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                onClick={() => handleApproveEvent(event.id)}
                className="bg-sports hover:bg-sports/90"
              >
                <Check className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => handleRejectEvent(event.id)}
              >
                <X className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Admin Dashboard
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="pending" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              Pending Reviews ({analytics.pendingEvents})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved Events ({analytics.approvedEvents})
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="pending" className="h-full overflow-y-auto mt-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : pendingEvents.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No pending events to review.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pendingEvents.map(event => (
                    <EventCard key={event.id} event={event} isPending={true} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="h-full overflow-y-auto mt-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : approvedEvents.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No approved events yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {approvedEvents.map(event => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="h-full overflow-y-auto mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalEvents}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    <Clock className="h-4 w-4 text-warning" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-warning">{analytics.pendingEvents}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Approved</CardTitle>
                    <Check className="h-4 w-4 text-sports" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-sports">{analytics.approvedEvents}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Events by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analytics.categoryCounts).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <Badge className={`${getCategoryColor(category)}`}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </Badge>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AdminPanel;