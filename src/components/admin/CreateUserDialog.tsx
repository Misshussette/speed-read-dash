import { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Club {
  id: string;
  name: string;
}

interface CreateUserDialogProps {
  isPlatformAdmin: boolean;
  isClubAdmin: boolean;
  /** For club_admin: their club(s) */
  callerClubs?: Club[];
  onUserCreated?: () => void;
}

export function CreateUserDialog({
  isPlatformAdmin,
  isClubAdmin,
  callerClubs = [],
  onUserCreated,
}: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<string>('user');
  const [clubId, setClubId] = useState<string>('');
  const [skipEmailConfirmation, setSkipEmailConfirmation] = useState(true);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);

  // Platform admins can see all clubs
  useEffect(() => {
    if (isPlatformAdmin && open) {
      supabase
        .from('clubs')
        .select('id, name')
        .order('name')
        .then(({ data }) => {
          if (data) setAllClubs(data);
        });
    }
  }, [isPlatformAdmin, open]);

  const clubs = isPlatformAdmin ? allClubs : callerClubs;

  // Auto-set club for club_admin with single club
  useEffect(() => {
    if (isClubAdmin && !isPlatformAdmin && callerClubs.length === 1) {
      setClubId(callerClubs[0].id);
    }
  }, [isClubAdmin, isPlatformAdmin, callerClubs]);

  const availableRoles = isPlatformAdmin
    ? [
        { value: 'user', label: 'User' },
        { value: 'club_admin', label: 'Club Admin' },
        { value: 'platform_admin', label: 'Platform Admin' },
      ]
    : [
        { value: 'user', label: 'User' },
        { value: 'club_admin', label: 'Club Admin' },
      ];

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setRole('user');
    setClubId(isClubAdmin && !isPlatformAdmin && callerClubs.length === 1 ? callerClubs[0].id : '');
    setSkipEmailConfirmation(true);
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: email.trim(),
          password: password || undefined,
          display_name: displayName.trim() || undefined,
          role,
          club_id: clubId || undefined,
          skip_email_confirmation: skipEmailConfirmation,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`User ${email} created successfully`);
      resetForm();
      setOpen(false);
      onUserCreated?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-1" /> Create User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            {isPlatformAdmin
              ? 'Create a user and optionally assign them to a club.'
              : 'Create a new user in your club.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="create-email">Email *</Label>
            <Input
              id="create-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="create-name">Display Name</Label>
            <Input
              id="create-name"
              placeholder="John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="create-password">Password</Label>
            <Input
              id="create-password"
              type="password"
              placeholder="Leave empty for invite-only"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Role selector: only for platform_admin or club_admin with options */}
          {(isPlatformAdmin || isClubAdmin) && (
            <div className="grid gap-2">
              <Label>Role</Label>
              {isPlatformAdmin ? (
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Club selector */}
          {clubs.length > 0 && (
            <div className="grid gap-2">
              <Label>Club</Label>
              {isClubAdmin && !isPlatformAdmin && clubs.length === 1 ? (
                <Input value={clubs[0].name} disabled />
              ) : (
                <Select value={clubId} onValueChange={setClubId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No club (personal)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No club</SelectItem>
                    {clubs.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="skip-email" className="text-sm">
              Skip email confirmation
            </Label>
            <Switch
              id="skip-email"
              checked={skipEmailConfirmation}
              onCheckedChange={setSkipEmailConfirmation}
            />
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Enable for desktop/offline setups without SMTP.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
