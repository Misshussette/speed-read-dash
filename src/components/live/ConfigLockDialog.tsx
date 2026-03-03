import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLive } from '@/contexts/LiveContext';
import { useI18n } from '@/i18n/I18nContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ConfigLockDialog = ({ open, onOpenChange }: Props) => {
  const { unlockConfig, setStints } = useLive();
  const { t } = useI18n();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('live_unlock_title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('live_unlock_desc')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              unlockConfig();
              setStints([]);
              onOpenChange(false);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('live_unlock_confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfigLockDialog;
