import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from './Button';

interface ProfileImageUploadProps {
  currentImage?: string | null;
  onUpload: (file: File) => Promise<void>;
  trigger: React.ReactNode;
}

export function ProfileImageUpload({ currentImage, onUpload, trigger }: ProfileImageUploadProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      await onUpload(selectedFile);
      setOpen(false);
      setPreview(null);
      setSelectedFile(null);
    } catch {
      // error handled by parent
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setSelectedFile(null);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-lg">
          <Dialog.Title className="text-heading-card text-navy mb-4">
            Update Profile Photo
          </Dialog.Title>

          {/* Current / Preview */}
          <div className="flex justify-center mb-6">
            {preview ? (
              <img src={preview} alt="Preview" className="h-32 w-32 rounded-full object-cover border-2 border-muted-200" />
            ) : currentImage ? (
              <img src={currentImage} alt="Current" className="h-32 w-32 rounded-full object-cover border-2 border-muted-200" />
            ) : (
              <div className="h-32 w-32 rounded-full bg-muted-200 flex items-center justify-center">
                <svg className="h-16 w-16 text-muted-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            )}
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-300 hover:border-primary'
            }`}
          >
            <img src="/icon/add_a_photo.png" alt="" className="h-8 w-8 mx-auto mb-2 opacity-60" />
            <p className="text-body text-muted-600">
              Drag & drop an image here, or <span className="text-primary font-medium">browse</span>
            </p>
            <p className="text-helper text-muted-400 mt-1">PNG, JPG up to 5MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            {preview && (
              <Button variant="outline" type="button" onClick={handleRemove}>
                Remove
              </Button>
            )}
            <Dialog.Close asChild>
              <Button variant="outline" type="button">Cancel</Button>
            </Dialog.Close>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile}
              isLoading={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
