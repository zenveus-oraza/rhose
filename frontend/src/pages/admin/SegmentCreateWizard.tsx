import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useCreateSegment } from '@/hooks/useAdminApi';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

const STEPS = ['Segment Info', 'Modules', 'Lessons', 'Quiz', 'Review'] as const;

interface SegmentFormData {
  title: string;
  description: string;
}

export function SegmentCreateWizard() {
  const navigate = useNavigate();
  const createSegment = useCreateSegment();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<SegmentFormData>({ title: '', description: '' });
  const [fieldErrors, setFieldErrors] = useState<{ title?: string }>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdSegmentId, setCreatedSegmentId] = useState<string | null>(null);

  function validateSegmentInfo(): boolean {
    const errors: { title?: string } = {};
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNext() {
    if (currentStep === 0 && !validateSegmentInfo()) return;
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  function handleSubmit() {
    createSegment.mutate(
      { title: formData.title.trim(), description: formData.description.trim() || undefined },
      {
        onSuccess: (segment) => {
          setCreatedSegmentId(segment.id);
          setShowSuccess(true);
        },
      }
    );
  }

  return (
    <div className="py-4 lg:px-8">
      {/* Header */}
      <div className="mb-5">
        <button
          onClick={() => navigate('/admin/content')}
          className="mb-4 inline-flex items-center gap-1 text-helper text-muted-500 hover:text-navy transition"
        >
          <ArrowLeft size={16} />
          <span>Back to Content</span>
        </button>
        <h1 className="text-heading-page text-navy">Create Segment</h1>
      </div>
      <div className="border-b border-muted-200 mb-6" />

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                    index < currentStep
                      ? 'bg-success text-white'
                      : index === currentStep
                      ? 'bg-teal text-white'
                      : 'bg-muted-200 text-muted-500'
                  }`}
                >
                  {index < currentStep ? <Check size={14} /> : index + 1}
                </div>
                <span
                  className={`hidden sm:inline text-helper ${
                    index === currentStep ? 'font-medium text-navy' : 'text-muted-500'
                  }`}
                >
                  {step}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 w-8 lg:w-12 ${
                    index < currentStep ? 'bg-success' : 'bg-muted-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-muted-200 bg-white p-6 shadow-sm">
        {createSegment.error && (
          <ErrorMessage
            message={createSegment.error.message || 'Failed to create segment'}
            className="mb-5"
          />
        )}

        {currentStep === 0 && (
          <SegmentInfoStep
            formData={formData}
            fieldErrors={fieldErrors}
            onChange={(data) => {
              setFormData(data);
              setFieldErrors({});
            }}
          />
        )}

        {currentStep === 1 && <PlaceholderStep title="Modules" description="You can add modules after creating the segment. Navigate to the segment details page to manage modules." />}
        {currentStep === 2 && <PlaceholderStep title="Lessons" description="Lessons can be added within modules after the segment is created." />}
        {currentStep === 3 && <PlaceholderStep title="Quiz" description="Quiz functionality is available in Milestone 4. Skip this step for now." />}

        {currentStep === 4 && (
          <ReviewStep formData={formData} />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-muted-300 px-4 py-2 text-helper font-medium text-muted-700 hover:bg-muted-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-1 rounded-lg bg-secondary px-4 py-2 text-helper font-medium text-white hover:bg-secondary/90 transition"
          >
            <span>Next</span>
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={createSegment.isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-teal px-5 py-2 text-helper font-medium text-white hover:bg-teal-600 transition disabled:opacity-60"
          >
            {createSegment.isPending ? 'Creating...' : 'Create Segment'}
          </button>
        )}
      </div>

      {/* Success Modal */}
      <SuccessModal
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          if (createdSegmentId) navigate(`/admin/content/segments/${createdSegmentId}`);
        }}
        title="Segment Created Successfully"
        description="Your new segment has been created. You can now add modules and lessons."
        actionLabel="Manage Segment"
        onAction={() => {
          setShowSuccess(false);
          if (createdSegmentId) navigate(`/admin/content/segments/${createdSegmentId}`);
        }}
      />
    </div>
  );
}


// --- Sub-components ---

function SegmentInfoStep({
  formData,
  fieldErrors,
  onChange,
}: {
  formData: SegmentFormData;
  fieldErrors: { title?: string };
  onChange: (data: SegmentFormData) => void;
}) {
  return (
    <div className="space-y-5 max-w-lg">
      <h2 className="text-heading-card text-navy mb-4">Segment Information</h2>

      <div>
        <label htmlFor="segment-title" className="block text-helper font-medium text-navy mb-1.5">
          Title <span className="text-danger">*</span>
        </label>
        <input
          id="segment-title"
          type="text"
          value={formData.title}
          onChange={(e) => onChange({ ...formData, title: e.target.value })}
          aria-invalid={!!fieldErrors.title}
          aria-describedby={fieldErrors.title ? 'segment-title-error' : undefined}
          className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition ${
            fieldErrors.title ? 'border-danger-400' : 'border-muted-300'
          }`}
          placeholder="Enter segment title"
        />
        {fieldErrors.title && (
          <p id="segment-title-error" className="mt-1 text-helper text-danger-600">
            {fieldErrors.title}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="segment-description" className="block text-helper font-medium text-navy mb-1.5">
          Description
        </label>
        <textarea
          id="segment-description"
          value={formData.description}
          onChange={(e) => onChange({ ...formData, description: e.target.value })}
          rows={4}
          className="w-full rounded-lg border border-muted-300 px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none"
          placeholder="Enter a description for this segment (optional)"
        />
      </div>
    </div>
  );
}

function PlaceholderStep({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-8 text-center">
      <h2 className="text-heading-card text-navy mb-2">{title}</h2>
      <p className="text-body text-muted-500 max-w-md mx-auto">{description}</p>
    </div>
  );
}

function ReviewStep({ formData }: { formData: SegmentFormData }) {
  return (
    <div className="max-w-lg">
      <h2 className="text-heading-card text-navy mb-4">Review & Create</h2>
      <p className="text-body text-muted-600 mb-6">
        Review the segment details before creating.
      </p>

      <div className="space-y-4 rounded-lg border border-muted-200 bg-muted-50 p-4">
        <div>
          <span className="text-helper font-medium text-muted-500">Title</span>
          <p className="text-body text-navy mt-0.5">{formData.title || '—'}</p>
        </div>
        <div>
          <span className="text-helper font-medium text-muted-500">Description</span>
          <p className="text-body text-navy mt-0.5">{formData.description || 'No description'}</p>
        </div>
        <div>
          <span className="text-helper font-medium text-muted-500">Status</span>
          <p className="text-body text-navy mt-0.5">Draft (default)</p>
        </div>
      </div>
    </div>
  );
}
