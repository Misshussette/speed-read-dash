import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Users, Focus } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableDrivers: string[];
  preselectedDrivers?: string[];
  sessionName?: string;
  onConfirm: (drivers: string[]) => void;
  /** If true, shows "Skip" option to analyze all drivers */
  allowSkip?: boolean;
}

export default function DriverScopeDialog({
  open, onOpenChange, availableDrivers, preselectedDrivers, sessionName, onConfirm, allowSkip = true,
}: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Initialize from preselected
  useEffect(() => {
    if (open) {
      setSelected(new Set(preselectedDrivers || []));
    }
  }, [open, preselectedDrivers]);

  const toggleDriver = (driver: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(driver)) next.delete(driver);
      else next.add(driver);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === availableDrivers.length) setSelected(new Set());
    else setSelected(new Set(availableDrivers));
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
  };

  const handleSkip = () => {
    onConfirm([]); // empty = all drivers
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Focus className="h-5 w-5 text-primary" />
            {t('scope_select_drivers_title')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {sessionName
              ? t('scope_select_drivers_desc_named').replace('{name}', sessionName)
              : t('scope_select_drivers_desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-1">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox
              checked={availableDrivers.length > 0 && selected.size === availableDrivers.length}
              onCheckedChange={toggleAll}
            />
            <span className="text-muted-foreground">{t('mdb_select_all')} ({availableDrivers.length})</span>
          </label>
          {selected.size > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selected.size} {t('scope_drivers_selected')}
            </Badge>
          )}
        </div>

        <ScrollArea className="max-h-[300px] border rounded-md">
          <div className="divide-y divide-border">
            {availableDrivers.map(driver => (
              <label
                key={driver}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selected.has(driver)}
                  onCheckedChange={() => toggleDriver(driver)}
                />
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{driver}</span>
              </label>
            ))}
            {availableDrivers.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t('scope_no_drivers')}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          {allowSkip && (
            <Button variant="outline" onClick={handleSkip}>
              {t('scope_skip_all_drivers')}
            </Button>
          )}
          <Button onClick={handleConfirm} disabled={selected.size === 0}>
            {t('scope_confirm_selection')} ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
