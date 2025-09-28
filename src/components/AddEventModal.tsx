import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { MapPin, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: any) => Promise<void>;
  onLocationPick: () => void;
  onUseCurrentLocation: () => void;
  selectedLocation: { lat: number; lng: number } | null;
}

const AddEventModal: React.FC<AddEventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onLocationPick,
  onUseCurrentLocation,
  selectedLocation
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    organizer: '',
    category: '',
    start_date: '',
    end_date: '',
    event_link: '',
    poster_url: '',
    image_url_1: '',
    image_url_2: '',
    image_url_3: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedLocation) {
      toast({
        title: "Location Required",
        description: "Please select a location for the event.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: "Category Required", 
        description: "Please select an event category.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { poster_url, image_url_1, image_url_2, image_url_3, ...restFormData } = formData;
      const eventData = {
        ...restFormData,
        location_lat: selectedLocation.lat,
        location_lng: selectedLocation.lng,
        poster_url: poster_url || null,
        image_urls: [image_url_1, image_url_2, image_url_3].filter(url => url.trim() !== '')
      };

      await onSubmit(eventData);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        organizer: '',
        category: '',
        start_date: '',
        end_date: '',
        event_link: '',
        poster_url: '',
        image_url_1: '',
        image_url_2: '',
        image_url_3: ''
      });
      
      onClose();
      
      toast({
        title: "Event Submitted",
        description: "Your event has been submitted for approval.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error submitting event:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit a New Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter event title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizer">Organizer *</Label>
              <Input
                id="organizer"
                value={formData.organizer}
                onChange={(e) => handleInputChange('organizer', e.target.value)}
                placeholder="Event organizer"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Event description"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cultural">Cultural</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date & Time *</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date & Time</Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_link">Event Link (Optional)</Label>
            <Input
              id="event_link"
              value={formData.event_link}
              onChange={(e) => handleInputChange('event_link', e.target.value)}
              placeholder="https://example.com/event-info"
              type="url"
            />
          </div>

          {/* Location Selection */}
          <div className="space-y-2">
            <Label>Event Location *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button type="button" onClick={onLocationPick} variant="outline" className="w-full">
                <MapPin className="w-4 h-4 mr-2" />
                Select on Map
              </Button>
              <Button type="button" onClick={onUseCurrentLocation} variant="outline" className="w-full">
                <Calendar className="w-4 h-4 mr-2" />
                Use Current Location
              </Button>
            </div>
            {selectedLocation && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
              </p>
            )}
          </div>

          {/* Image URLs */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="poster_url">Main Poster Image URL (Optional)</Label>
              <Input
                id="poster_url"
                type="url"
                value={formData.poster_url}
                onChange={(e) => handleInputChange('poster_url', e.target.value)}
                placeholder="https://example.com/poster.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Image URLs (Optional)</Label>
              {[1, 2, 3].map((num) => (
                <Input
                  key={num}
                  type="url"
                  value={formData[`image_url_${num}` as keyof typeof formData]}
                  onChange={(e) => handleInputChange(`image_url_${num}`, e.target.value)}
                  placeholder={`https://example.com/image${num}.jpg`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEventModal;