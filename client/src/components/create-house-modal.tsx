import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface CreateHouseModalProps {
  open: boolean;
  userId: number;
  onSuccess: () => void;
}

export default function CreateHouseModal({ open, userId, onSuccess }: CreateHouseModalProps) {
  const [houseName, setHouseName] = useState('');
  const { toast } = useToast();

  const createHouseMutation = useMutation({
    mutationFn: async (name: string) => {
      // Create house
      const houseRes = await fetch('/api/houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          createdById: userId,
        }),
      });
      if (!houseRes.ok) throw new Error('Failed to create house');
      const house = await houseRes.json();

      // Add user as owner
      const memberRes = await fetch(`/api/houses/${house.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          role: 'owner',
        }),
      });
      if (!memberRes.ok) throw new Error('Failed to add user as owner');

      // Create default devices
      const devices = [
        { name: 'Living Room Light', type: 'light' },
        { name: 'Kitchen Light', type: 'light' },
        { name: 'Thermostat', type: 'thermostat', data: { temperature: 22, boilerActive: false } },
        { name: 'TV', type: 'tv' },
      ];

      for (const device of devices) {
        await fetch('/api/devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: device.name,
            type: device.type,
            status: device.type === 'thermostat' ? 'active' : 'inactive',
            data: device.data || null,
            houseId: house.id,
          }),
        });
      }

      return house;
    },
    onSuccess: () => {
      toast({
        title: 'House Created',
        description: 'Your house has been successfully created!',
      });
      setHouseName('');
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create house',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Home className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">Create Your House</DialogTitle>
          <DialogDescription className="text-center">
            Welcome! Let's get started by creating your first house.
            You can invite family members and manage tasks together.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="house-name">House Name</Label>
            <Input
              id="house-name"
              placeholder="e.g., Smith Family Home"
              value={houseName}
              onChange={(e) => setHouseName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && houseName.trim()) {
                  createHouseMutation.mutate(houseName);
                }
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            onClick={() => createHouseMutation.mutate(houseName)}
            disabled={!houseName.trim() || createHouseMutation.isPending}
          >
            {createHouseMutation.isPending ? 'Creating...' : 'Create House'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
