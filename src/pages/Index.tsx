import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, BarChart3, Download, ArrowRight, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { useI18n } from '@/i18n/I18nContext';
import LanguageSelector from '@/components/LanguageSelector';
import { toast } from 'sonner';

const Index = () => {
  const navigate = useNavigate();
  const { addCSV, isLoading, sessions } = useTelemetry();
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error(t('upload_error_csv'));
      return;
    }
    await addCSV(file);
    navigate('/app');
  }, [addCSV, navigate, t]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const hasExistingData = sessions.length > 0;

  const features = [
    { icon: Upload, title: t('feat_upload_title'), desc: t('feat_upload_desc') },
    { icon: BarChart3, title: t('feat_analyze_title'), desc: t('feat_analyze_desc') },
    { icon: Download, title: t('feat_export_title'), desc: t('feat_export_desc') },
  ];

  return (
    <div className="min-h-screen bg-background dark">
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector />
      </div>

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(hsl(185 70% 50%) 1px, transparent 1px), linear-gradient(90deg, hsl(185 70% 50%) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Gauge className="h-10 w-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Stint<span className="text-primary">Lab</span>
            </h1>
          </div>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-12 font-light">
            {t('tagline')}
          </p>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`
              relative mx-auto max-w-lg border-2 border-dashed rounded-xl p-12 transition-all cursor-pointer
              ${isDragging 
                ? 'border-primary bg-primary/5 scale-[1.02]' 
                : 'border-border hover:border-primary/50 hover:bg-card/50'}
            `}
            onClick={() => document.getElementById('csv-input')?.click()}
          >
            <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={onFileSelect} />
            <Upload className={`h-10 w-10 mx-auto mb-4 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-foreground font-medium mb-1">
              {isLoading ? t('upload_parsing') : t('upload_drop')}
            </p>
            <p className="text-sm text-muted-foreground">{t('upload_browse')}</p>
          </div>

          {hasExistingData && (
            <Button variant="ghost" className="mt-6 text-primary hover:text-primary" onClick={() => navigate('/app')}>
              {t('continue_dashboard')} ({sessions.length} {t('session_count')}) <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="bg-card/50 border-border/50 backdrop-blur-sm">
              <CardContent className="pt-6 text-center">
                <Icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <footer className="border-t border-border py-8 text-center">
        <p className="text-sm text-muted-foreground">
          StintLab © {new Date().getFullYear()} •{' '}
          <a href="/about" className="text-primary hover:underline">About</a>
        </p>
      </footer>
    </div>
  );
};

export default Index;
