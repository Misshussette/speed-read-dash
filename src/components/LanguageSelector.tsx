import { useI18n } from '@/i18n/I18nContext';
import { supportedLocales, localeLabels } from '@/i18n/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LanguageSelector = () => {
  const { locale, setLocale } = useI18n();

  return (
    <Select value={locale} onValueChange={(v) => setLocale(v as typeof locale)}>
      <SelectTrigger className="w-[130px] h-8 text-xs bg-secondary/50 border-border">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {supportedLocales.map(l => (
          <SelectItem key={l} value={l} className="text-xs">{localeLabels[l]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LanguageSelector;
