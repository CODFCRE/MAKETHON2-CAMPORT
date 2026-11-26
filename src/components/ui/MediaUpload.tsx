import React, { useState, useRef } from 'react';
import { Upload, X, ShieldCheck, AlertTriangle, Rocket } from 'lucide-react';
import { uploadMedia } from '../../utils/uploadMedia';
import Button from './Button';
import { toast } from 'react-hot-toast';

interface MediaUploadProps {
  onUploadSuccess?: (url: string) => void;
}

const MediaUpload: React.FC<MediaUploadProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/')) {
        toast.error('Please select an image or video file.');
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const loadingToast = toast.loading('Uploading media...');

    try {
      const response = await uploadMedia(file);

      if (response.success) {
        toast.success('Media uploaded successfully!', { id: loadingToast });
        setFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (onUploadSuccess && response.url) {
          onUploadSuccess(response.url);
        }
      } else {
        toast.error(response.message || 'Upload blocked', { 
            id: loadingToast,
            duration: 5000,
            icon: <AlertTriangle className="text-error" />
        });
      }
    } catch (error) {
      toast.error('Unexpected error during upload.', { id: loadingToast });
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 bg-surface-container-low rounded-[2rem] border border-white/5 space-y-6">
      <div className="flex items-center gap-3 px-2">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-on-surface">Secure Upload</h3>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black">AI-Powered Safety Filter</p>
        </div>
      </div>

      <div 
        onClick={() => !file && fileInputRef.current?.click()}
        className={`relative aspect-video rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden ${
          file ? 'border-primary/20 bg-surface-container-high' : 'border-white/10 hover:border-primary/40 cursor-pointer bg-surface-container-lowest'
        }`}
      >
        <input 
          type="file" 
          title="Upload image or video file"
          aria-label="Upload image or video file"
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*,video/*" 
          className="hidden" 
        />

        {previewUrl ? (
          <div className="absolute inset-0 group">
            {file?.type.startsWith('image/') ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <video src={previewUrl} className="w-full h-full object-cover" muted />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                type="button"
                title="Remove selected media"
                aria-label="Remove selected media"
                onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                className="w-12 h-12 rounded-full bg-error text-white flex items-center justify-center active:scale-90 transition-transform"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-10 opacity-60">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <Upload size={32} />
            </div>
            <div className="text-center">
              <span className="text-sm font-bold text-on-surface">Choose Media</span>
              <p className="text-[10px] text-on-surface-variant font-medium mt-1 uppercase tracking-widest">Image or Video up to 50MB</p>
            </div>
          </div>
        )}
      </div>

      {file && (
        <div className="space-y-3">
          <p className="text-[9px] font-black uppercase text-primary tracking-widest text-center animate-pulse">Ready to process? Click below</p>
          <Button 
            onClick={handleUpload} 
            isLoading={isUploading}
            className="w-full h-16 rounded-2xl gap-3 text-lg font-black"
          >
            {isUploading ? (
              <>UPLOADING...</>
            ) : (
              <>
                CONFIRM UPLOAD
                <Rocket size={20} />
              </>
            )}
          </Button>
        </div>
      )}

      <div className="px-4 py-3 bg-error/5 rounded-2xl border border-error/10 flex gap-3 items-center">
        <AlertTriangle size={16} className="text-error shrink-0" />
        <p className="text-[10px] font-bold text-error/80 leading-relaxed">
          Upload limit is 50MB. Use clear images/videos for best results in Explore feed.
        </p>
      </div>
    </div>
  );
};
export default MediaUpload;
