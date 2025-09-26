import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { MapPin, Calendar, Upload } from 'lucide-react';
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
    event_link: ''
  });
  const [files, setFiles] = useState({
    poster: null as File | null,
    image1: null as File | null,
    image2: null as File | null,
    image3: null as File | null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [field]: file }));
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
      const eventData = {
        ...formData,
        location_lat: selectedLocation.lat,
        location_lng: selectedLocation.lng,
        poster: files.poster,
        images: [files.image1, files.image2, files.image3].filter(Boolean)
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
        event_link: ''
      });
      setFiles({
        poster: null,
        image1: null,
        image2: null,
        image3: null
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

          {/* File Uploads */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="poster">Main Poster Image</Label>
              <Input
                id="poster"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange('poster', e.target.files?.[0] || null)}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Images (up to 3)</Label>
              {[1, 2, 3].map((num) => (
                <Input
                  key={num}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(`image${num}`, e.target.files?.[0] || null)}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-secondary/50 file:text-secondary-foreground hover:file:bg-secondary/70"
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