import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, BarChart3, Download, ArrowRight, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { toast } from 'sonner';

const Index = () => {
  const navigate = useNavigate();
  const { uploadCSV, isLoading, rawData } = useTelemetry();
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a .csv file');
      return;
    }
    await uploadCSV(file);
    navigate('/app');
  }, [uploadCSV, navigate]);

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

  // If user already has data, offer to go to dashboard
  const hasExistingData = rawData.length > 0;

  return (
    <div className="min-h-screen bg-background dark">
      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(hsl(185 70% 50%) 1px, transparent 1px), linear-gradient(90deg, hsl(185 70% 50%) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <Gauge className="h-10 w-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Stint<span className="text-primary">Lab</span>
            </h1>
          </div>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-12 font-light">
            Engineering Your Race Data.
          </p>

          {/* Upload Zone */}
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
            <input
              id="csv-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={onFileSelect}
            />
            <Upload className={`h-10 w-10 mx-auto mb-4 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-foreground font-medium mb-1">
              {isLoading ? 'Parsing...' : 'Drop your CSV here'}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse • semicolon-delimited
            </p>
          </div>

          {hasExistingData && (
            <Button
              variant="ghost"
              className="mt-6 text-primary hover:text-primary"
              onClick={() => navigate('/app')}
            >
              Continue to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Upload, title: 'Upload', desc: 'Drop your analysis.csv and data is parsed instantly' },
            { icon: BarChart3, title: 'Analyze', desc: 'Interactive charts, KPIs, and driver comparisons' },
            { icon: Download, title: 'Export', desc: 'Download filtered data or charts as PNG' },
          ].map(({ icon: Icon, title, desc }) => (
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

      {/* Footer */}
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
