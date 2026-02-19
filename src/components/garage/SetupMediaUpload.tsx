import { useState, useRef } from 'react';
import { ImagePlus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n/I18nContext';
import { toast } from 'sonner';

interface Props {
  images: string[];
  onImagesChange: (images: string[]) => void;
  setupId: string;
}

export default function SetupMediaUpload({ images, onImagesChange, setupId }: Props) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${setupId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('setup-media').upload(path, file);
        if (error) {
          toast.error(error.message);
          continue;
        }
        const { data: urlData } = supabase.storage.from('setup-media').getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
      }

      if (newUrls.length > 0) {
        onImagesChange([...images, ...newUrls]);
        toast.success(t('garage_media_uploaded'));
      }
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = (url: string) => {
    onImagesChange(images.filter(u => u !== url));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{t('garage_media')}</p>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
          {t('garage_add_image')}
        </Button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((url, i) => (
            <div key={i} className="relative group aspect-square rounded-md overflow-hidden border border-border bg-muted">
              <img src={url} alt={`Setup ${i + 1}`} className="w-full h-full object-cover" />
              <Button
                variant="destructive"
                size="icon"
                className="h-5 w-5 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(url)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
