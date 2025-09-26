import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, Users, Heart, BookmarkPlus, Search } from 'lucide-react';

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

interface EventListProps {
  events: Event[];
  savedEventIds: string[];
  onRegister: (eventId: string) => void;
  onSaveToggle: (eventId: string) => void;
  onGetDirections: (lat: number, lng: number) => void;
  currentView: 'all' | 'saved';
  onViewChange: (view: 'all' | 'saved') => void;
}

const EventList: React.FC<EventListProps> = ({
  events,
  savedEventIds,
  onRegister,
  onSaveToggle,
  onGetDirections,
  currentView,
  onViewChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.organizer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
    const matchesView = currentView === 'all' || savedEventIds.includes(event.id);
    
    return matchesSearch && matchesCategory && matchesView;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cultural': return 'bg-cultural text-cultural-foreground';
      case 'technical': return 'bg-technical text-technical-foreground';
      case 'sports': return 'bg-sports text-sports-foreground';
      case 'academic': return 'bg-academic text-academic-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="space-y-4">
      {/* View Switcher */}
      <div className="flex border-b">
        <button
          onClick={() => onViewChange('all')}
          className={`flex-1 py-2 text-center font-semibold border-b-2 transition-colors ${
            currentView === 'all' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          All Events
        </button>
        <button
          onClick={() => onViewChange('saved')}
          className={`flex-1 py-2 text-center font-semibold border-b-2 transition-colors ${
            currentView === 'saved' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Saved Events
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search for events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="cultural">Cultural</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="sports">Sports</SelectItem>
            <SelectItem value="academic">Academic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {currentView === 'saved' ? 'No saved events found.' : 'No events found.'}
            </CardContent>
          </Card>
        ) : (
          filteredEvents.map((event) => (
            <Card key={event.id} className="transition-shadow hover:shadow-medium">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">{event.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        by {event.organizer}
                      </p>
                      
                      <div className="flex items-center text-xs text-muted-foreground mb-2">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(event.start_date).toLocaleDateString()} at{' '}
                        {new Date(event.start_date).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                      
                      <Badge className={`text-xs ${getCategoryColor(event.category)}`}>
                        {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => onRegister(event.id)}
                      className="flex-1 min-w-[80px]"
                    >
                      <Users className="w-3 h-3 mr-1" />
                      Register
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onGetDirections(event.location_lat, event.location_lng)}
                      className="flex-1 min-w-[80px]"
                    >
                      <MapPin className="w-3 h-3 mr-1" />
                      Directions
                    </Button>
                    
                    <Button 
                      variant={savedEventIds.includes(event.id) ? "destructive" : "secondary"}
                      size="sm"
                      onClick={() => onSaveToggle(event.id)}
                      className="px-3"
                    >
                      {savedEventIds.includes(event.id) ? (
                        <Heart className="w-3 h-3" fill="currentColor" />
                      ) : (
                        <BookmarkPlus className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default EventList;