import { useState } from 'react';
import { Bug, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n/I18nContext';
import { APP_VERSION } from '@/lib/app-version';
import { toast } from 'sonner';

const ReportIssueDialog = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('bug');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !description.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('issues').insert({
      user_id: user.id,
      type,
      description: description.trim(),
      version: APP_VERSION,
      current_page: window.location.pathname,
    } as any);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('issue_submitted'));
    setDescription('');
    setType('bug');
    setOpen(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title={t('issue_report')}>
          <Bug className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{t('issue_report')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{t('issue_type')}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bug" className="text-xs">{t('issue_type_bug')}</SelectItem>
                <SelectItem value="feature" className="text-xs">{t('issue_type_feature')}</SelectItem>
                <SelectItem value="improvement" className="text-xs">{t('issue_type_improvement')}</SelectItem>
                <SelectItem value="other" className="text-xs">{t('issue_type_other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('issue_description')}</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('issue_description_placeholder')}
              className="text-sm min-h-[100px]"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>v{APP_VERSION} • {window.location.pathname}</span>
          </div>
          <Button size="sm" className="w-full" disabled={!description.trim() || submitting} onClick={handleSubmit}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {t('issue_submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportIssueDialog;
