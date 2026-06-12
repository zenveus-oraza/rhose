import { useState, useEffect, useRef } from 'react';
import { Upload, FileCheck } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { useCreateLesson, useUpdateLesson, useLesson } from '@/hooks/useAdminApi';
import { uploadSlides, uploadVideo } from '@/services/admin.service';
import type { Lesson, LessonContentType, UploadedAssetMetadata } from '@/types/admin';

interface LessonDrawerProps {
  open: boolean;
  onClose: () => void;
  moduleId: string;
  lesson?: Lesson | null;
}

interface LessonFormData {
  title: string;
  contentType: LessonContentType;
  contentBody: string;
  videoUrl: string;
  videoMode: 'link' | 'upload';
  videoAsset: UploadedAssetMetadata | null;
  slidesUrl: string;
  slidesAsset: UploadedAssetMetadata | null;
  totalSlides: string;
  estimatedTime: string; // hh:mm format
}

interface LessonFieldErrors {
  title?: string;
  contentBody?: string;
  videoUrl?: string;
  videoFile?: string;
  slidesFile?: string;
  totalSlides?: string;
  estimatedTime?: string;
}

function minutesToHhmm(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function hhmmToMinutes(hhmm: string): number | null {
  const match = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (minutes >= 60) return null;
  return hours * 60 + minutes;
}

function formatFileSize(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${size} B`;
}

export function LessonDrawer({ open, onClose, moduleId, lesson }: LessonDrawerProps) {
  const isEditing = !!lesson;
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();

  // Fetch full lesson detail (includes videoUrl, contentBody, slidesUrl) when editing
  const { data: fullLesson } = useLesson(lesson?.id ?? '', {
    enabled: !!lesson?.id && open,
  });

  const [formData, setFormData] = useState<LessonFormData>({
    title: '',
    contentType: 'text',
    contentBody: '',
    videoUrl: '',
    videoMode: 'link',
    videoAsset: null,
    slidesUrl: '',
    slidesAsset: null,
    totalSlides: '',
    estimatedTime: '',
  });
  const [fieldErrors, setFieldErrors] = useState<LessonFieldErrors>({});
  const [slidesFile, setSlidesFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Use the full lesson detail if available, otherwise fall back to the prop
    const lessonData = fullLesson ?? lesson;
    if (lessonData) {
      let timeDisplay = '';
      if (lessonData.estimatedTimeValue != null) {
        const totalMinutes = lessonData.estimatedTimeUnit === 'hours'
          ? lessonData.estimatedTimeValue * 60
          : lessonData.estimatedTimeValue;
        timeDisplay = minutesToHhmm(totalMinutes);
      }
      setFormData({
        title: lessonData.title,
        contentType: lessonData.contentType,
        contentBody: lessonData.contentBody || '',
        videoUrl: lessonData.videoUrl || '',
        videoMode: lessonData.videoAsset ? 'upload' : 'link',
        videoAsset: lessonData.videoAsset ?? null,
        slidesUrl: lessonData.slidesUrl || '',
        slidesAsset: lessonData.slidesAsset ?? null,
        totalSlides: lessonData.totalSlides ? String(lessonData.totalSlides) : '',
        estimatedTime: timeDisplay,
      });
    } else {
      setFormData({
        title: '',
        contentType: 'text',
        contentBody: '',
        videoUrl: '',
        videoMode: 'link',
        videoAsset: null,
        slidesUrl: '',
        slidesAsset: null,
        totalSlides: '',
        estimatedTime: '',
      });
    }
    setFieldErrors({});
    setSlidesFile(null);
    setVideoFile(null);
  }, [fullLesson, lesson, open]);

  function validate(): boolean {
    const errors: LessonFieldErrors = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }

    if (formData.contentType === 'text' && !formData.contentBody.trim()) {
      errors.contentBody = 'Content body is required for text lessons';
    }

    if (formData.contentType === 'video') {
      if (formData.videoMode === 'link') {
        if (!formData.videoUrl.trim()) {
          errors.videoUrl = 'Video URL is required';
        } else {
          try {
            new URL(formData.videoUrl.trim());
          } catch {
            errors.videoUrl = 'Please enter a valid URL';
          }
        }
      } else {
        // Upload mode — need either an existing URL or a new file
        if (!formData.videoUrl && !videoFile) {
          errors.videoFile = 'Please upload a video file (MP4, WebM, MOV, etc.)';
        }
      }
    }

    if (formData.contentType === 'slides') {
      // Need either an existing slides URL (editing) or a new file
      if (!formData.slidesUrl && !slidesFile) {
        errors.slidesFile = 'Please upload a slides file (PPTX, PPT, or PDF)';
      }
      if (!formData.totalSlides.trim()) {
        errors.totalSlides = 'Total number of slides is required';
      } else {
        const num = parseInt(formData.totalSlides, 10);
        if (isNaN(num) || num < 1) {
          errors.totalSlides = 'Must be a positive number';
        }
      }
    }

    if (formData.estimatedTime.trim()) {
      const minutes = hhmmToMinutes(formData.estimatedTime.trim());
      if (minutes === null) {
        errors.estimatedTime = 'Format must be hh:mm (e.g., 01:30)';
      } else if (minutes <= 0) {
        errors.estimatedTime = 'Time must be greater than 00:00';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const base = {
      title: formData.title.trim(),
      content_type: formData.contentType,
      ...(formData.estimatedTime.trim()
        ? {
            estimated_time_value: hhmmToMinutes(formData.estimatedTime.trim())!,
            estimated_time_unit: 'minutes' as const,
          }
        : {}),
    };

    let data: any = { ...base };

    if (formData.contentType === 'text') {
      data.content_body = formData.contentBody.trim();
      data.video_url = null;
      data.video_asset = null;
      data.slides_url = null;
      data.slides_asset = null;
      data.total_slides = null;
    } else if (formData.contentType === 'video') {
      data.content_body = null;
      data.slides_url = null;
      data.slides_asset = null;
      data.total_slides = null;
      if (formData.videoMode === 'upload') {
        // Upload file first if a new file was selected
        if (videoFile) {
          try {
            setIsUploading(true);
            const uploadResult = await uploadVideo(videoFile);
            data.video_url = uploadResult.url;
            data.video_asset = {
              key: uploadResult.key,
              originalName: uploadResult.originalName,
              size: uploadResult.size,
              mimeType: uploadResult.mimeType,
            };
          } catch (err: any) {
            setFieldErrors({ videoFile: err.message || 'Video upload failed' });
            setIsUploading(false);
            return;
          } finally {
            setIsUploading(false);
          }
        } else {
          // Keep existing URL when editing without re-uploading
          data.video_url = formData.videoUrl;
          data.video_asset = formData.videoAsset;
        }
      } else {
        data.video_url = formData.videoUrl.trim();
        data.video_asset = null;
      }
    } else if (formData.contentType === 'slides') {
      data.content_body = null;
      data.video_url = null;
      data.video_asset = null;
      // Upload file first if a new file was selected
      if (slidesFile) {
        try {
          setIsUploading(true);
          const uploadResult = await uploadSlides(slidesFile);
          data.slides_url = uploadResult.url;
          data.slides_asset = {
            key: uploadResult.key,
            originalName: uploadResult.originalName,
            size: uploadResult.size,
            mimeType: uploadResult.mimeType,
          };
        } catch (err: any) {
          setFieldErrors({ slidesFile: err.message || 'Upload failed' });
          setIsUploading(false);
          return;
        } finally {
          setIsUploading(false);
        }
      } else {
        // Keep existing URL when editing without re-uploading
        data.slides_url = formData.slidesUrl;
        data.slides_asset = formData.slidesAsset;
      }
      data.total_slides = parseInt(formData.totalSlides, 10);
    }

    if (isEditing && lesson) {
      updateLesson.mutate(
        { id: lesson.id, data },
        { onSuccess: () => onClose() }
      );
    } else {
      createLesson.mutate(
        { moduleId, data },
        { onSuccess: () => onClose() }
      );
    }
  }

  const isPending = createLesson.isPending || updateLesson.isPending || isUploading;
  const error = createLesson.error || updateLesson.error;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Lesson' : 'Add Lesson'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <ErrorMessage message={
            error.details
              ? Object.values(error.details).join('. ')
              : error.message || 'An error occurred'
          } />
        )}

        {/* Title */}
        <div>
          <label htmlFor="lesson-title" className="block text-helper font-medium text-navy mb-1.5">
            Title <span className="text-danger">*</span>
          </label>
          <input
            id="lesson-title"
            type="text"
            value={formData.title}
            onChange={(e) => {
              setFormData({ ...formData, title: e.target.value });
              if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: undefined }));
            }}
            aria-invalid={!!fieldErrors.title}
            className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition ${
              fieldErrors.title ? 'border-danger-400' : 'border-muted-300'
            }`}
            placeholder="Enter lesson title"
          />
          {fieldErrors.title && (
            <p className="mt-1 text-helper text-danger-600">{fieldErrors.title}</p>
          )}
        </div>

        {/* Content Type */}
        <div>
          <label className="block text-helper font-medium text-navy mb-1.5">
            Content Type <span className="text-danger">*</span>
          </label>
          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="contentType"
                value="text"
                checked={formData.contentType === 'text'}
                onChange={() => setFormData({ ...formData, contentType: 'text' })}
                className="h-4 w-4 text-teal accent-teal"
              />
              <span className="text-body text-navy">Text</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="contentType"
                value="video"
                checked={formData.contentType === 'video'}
                onChange={() => setFormData({ ...formData, contentType: 'video' })}
                className="h-4 w-4 text-teal accent-teal"
              />
              <span className="text-body text-navy">Video</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="contentType"
                value="slides"
                checked={formData.contentType === 'slides'}
                onChange={() => setFormData({ ...formData, contentType: 'slides' })}
                className="h-4 w-4 text-teal accent-teal"
              />
              <span className="text-body text-navy">Slides</span>
            </label>
          </div>
        </div>

        {/* Conditional Content Fields */}
        {formData.contentType === 'text' && (
          <div>
            <label htmlFor="lesson-content" className="block text-helper font-medium text-navy mb-1.5">
              Content Body <span className="text-danger">*</span>
            </label>
            <textarea
              id="lesson-content"
              value={formData.contentBody}
              onChange={(e) => {
                setFormData({ ...formData, contentBody: e.target.value });
                if (fieldErrors.contentBody) setFieldErrors((prev) => ({ ...prev, contentBody: undefined }));
              }}
              rows={6}
              aria-invalid={!!fieldErrors.contentBody}
              className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none ${
                fieldErrors.contentBody ? 'border-danger-400' : 'border-muted-300'
              }`}
              placeholder="Enter the lesson content"
            />
            {fieldErrors.contentBody && (
              <p className="mt-1 text-helper text-danger-600">{fieldErrors.contentBody}</p>
            )}
          </div>
        )}

        {formData.contentType === 'video' && (
          <div className="space-y-3">
            {/* Video source toggle */}
            <div>
              <label className="block text-helper font-medium text-navy mb-1.5">
                Video Source <span className="text-danger">*</span>
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, videoMode: 'link' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                    formData.videoMode === 'link'
                      ? 'bg-secondary text-white border-secondary'
                      : 'bg-white text-muted-600 border-muted-300 hover:border-muted-400'
                  }`}
                >
                  Paste Link
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, videoMode: 'upload' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                    formData.videoMode === 'upload'
                      ? 'bg-secondary text-white border-secondary'
                      : 'bg-white text-muted-600 border-muted-300 hover:border-muted-400'
                  }`}
                >
                  Upload File
                </button>
              </div>
            </div>

            {formData.videoMode === 'link' && (
              <div>
                <input
                  id="lesson-video-url"
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, videoUrl: e.target.value });
                    if (fieldErrors.videoUrl) setFieldErrors((prev) => ({ ...prev, videoUrl: undefined }));
                  }}
                  aria-invalid={!!fieldErrors.videoUrl}
                  className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition ${
                    fieldErrors.videoUrl ? 'border-danger-400' : 'border-muted-300'
                  }`}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                />
                {fieldErrors.videoUrl && (
                  <p className="mt-1 text-helper text-danger-600">{fieldErrors.videoUrl}</p>
                )}
                <p className="mt-1 text-xs text-muted-400">Supports YouTube, Vimeo, and direct video URLs</p>
              </div>
            )}

            {formData.videoMode === 'upload' && (
              <div>
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition hover:border-teal hover:bg-teal-50/30 ${
                    fieldErrors.videoFile ? 'border-danger-400' : 'border-muted-300'
                  }`}
                  onClick={() => videoFileInputRef.current?.click()}
                >
                  <input
                    ref={videoFileInputRef}
                    type="file"
                    accept=".mp4,.webm,.ogg,.mov,.avi,.mkv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setVideoFile(file);
                      if (file) {
                        setFormData((current) => ({ ...current, videoAsset: null }));
                        if (fieldErrors.videoFile) setFieldErrors((prev) => ({ ...prev, videoFile: undefined }));
                      }
                    }}
                  />
                  {videoFile || formData.videoAsset ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileCheck className="h-5 w-5 text-teal" />
                      <div className="min-w-0 text-left">
                        <p className="truncate text-sm font-medium text-navy">
                          {videoFile?.name || formData.videoAsset?.originalName}
                        </p>
                        <p className="text-xs text-muted-400">
                          {videoFile
                            ? formatFileSize(videoFile.size)
                            : formData.videoAsset
                              ? `${formatFileSize(formData.videoAsset.size)} • uploaded`
                              : ''}
                        </p>
                      </div>
                      <span className="text-xs text-muted-400">
                        {videoFile ? '(selected)' : '(replaceable)'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-400" />
                      <p className="text-sm text-muted-500">
                        Click to upload <span className="font-medium">MP4, WebM, MOV</span>
                      </p>
                      <p className="text-xs text-muted-400">Max 20MB</p>
                    </div>
                  )}
                </div>
                {fieldErrors.videoFile && (
                  <p className="mt-1 text-helper text-danger-600">{fieldErrors.videoFile}</p>
                )}
              </div>
            )}
          </div>
        )}

        {formData.contentType === 'slides' && (
          <>
            <div>
              <label className="block text-helper font-medium text-navy mb-1.5">
                Slides File <span className="text-danger">*</span>
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition hover:border-teal hover:bg-teal-50/30 ${
                  fieldErrors.slidesFile ? 'border-danger-400' : 'border-muted-300'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pptx,.ppt,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setSlidesFile(file);
                    if (file) {
                      setFormData((current) => ({ ...current, slidesAsset: null }));
                      if (fieldErrors.slidesFile) setFieldErrors((prev) => ({ ...prev, slidesFile: undefined }));
                    }
                  }}
                />
                {slidesFile || formData.slidesAsset ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileCheck className="h-5 w-5 text-teal" />
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-medium text-navy">
                        {slidesFile?.name || formData.slidesAsset?.originalName}
                      </p>
                      <p className="text-xs text-muted-400">
                        {slidesFile
                          ? formatFileSize(slidesFile.size)
                          : formData.slidesAsset
                            ? `${formatFileSize(formData.slidesAsset.size)} • uploaded`
                            : ''}
                      </p>
                    </div>
                    <span className="text-xs text-muted-400">
                      {slidesFile ? '(selected)' : '(replaceable)'}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-400" />
                    <p className="text-sm text-muted-500">
                      Click to upload <span className="font-medium">PPTX, PPT, or PDF</span>
                    </p>
                    <p className="text-xs text-muted-400">Max 50MB</p>
                  </div>
                )}
              </div>
              {fieldErrors.slidesFile && (
                <p className="mt-1 text-helper text-danger-600">{fieldErrors.slidesFile}</p>
              )}
            </div>

            <div>
              <label htmlFor="lesson-total-slides" className="block text-helper font-medium text-navy mb-1.5">
                Total Slides <span className="text-danger">*</span>
              </label>
              <input
                id="lesson-total-slides"
                type="number"
                min="1"
                value={formData.totalSlides}
                onChange={(e) => {
                  setFormData({ ...formData, totalSlides: e.target.value });
                  if (fieldErrors.totalSlides) setFieldErrors((prev) => ({ ...prev, totalSlides: undefined }));
                }}
                aria-invalid={!!fieldErrors.totalSlides}
                className={`w-40 rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition ${
                  fieldErrors.totalSlides ? 'border-danger-400' : 'border-muted-300'
                }`}
                placeholder="e.g., 12"
              />
              {fieldErrors.totalSlides && (
                <p className="mt-1 text-helper text-danger-600">{fieldErrors.totalSlides}</p>
              )}
            </div>
          </>
        )}

        {/* Estimated Time (always shown regardless of content type) */}
        <div>
          <label htmlFor="lesson-estimated-time" className="block text-helper font-medium text-navy mb-1.5">
            Estimated Time (hh:mm)
          </label>
          <input
            id="lesson-estimated-time"
            type="text"
            value={formData.estimatedTime}
            onChange={(e) => {
              setFormData({ ...formData, estimatedTime: e.target.value });
              if (fieldErrors.estimatedTime) setFieldErrors((prev) => ({ ...prev, estimatedTime: undefined }));
            }}
            aria-invalid={!!fieldErrors.estimatedTime}
            className={`w-40 rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition ${
              fieldErrors.estimatedTime ? 'border-danger-400' : 'border-muted-300'
            }`}
            placeholder="hh:mm"
          />
          {fieldErrors.estimatedTime && (
            <p className="mt-1 text-helper text-danger-600">{fieldErrors.estimatedTime}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-muted-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-muted-300 px-4 py-2 text-helper font-medium text-muted-700 hover:bg-muted-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-secondary px-4 py-2 text-helper font-medium text-white hover:bg-secondary/90 transition disabled:opacity-60"
          >
            {isPending ? (isUploading ? 'Uploading...' : 'Saving...') : isEditing ? 'Update Lesson' : 'Add Lesson'}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
