import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCreateUser, useSegments, useCreateAssignment } from '@/hooks/useAdminApi';
import { LoadingIndicator, ErrorMessage, SuccessModal } from '@/components/shared';
import type { UserRole } from '@/types/admin';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'learner', label: 'Learner' },
];

const JOB_TITLE_OPTIONS = [
  'Dental Hygienist',
  'Dental Assistant',
  'Practice Manager',
  'Associate Dentist',
  'Lead Dentist',
  'Clinical Director',
  'Sterilization Technician',
  'Lab Technician',
  'Dental Practitioner',
];

export function UserCreatePage() {
  const navigate = useNavigate();
  const createUserMutation = useCreateUser();
  const createAssignmentMutation = useCreateAssignment();
  const { data: segmentsData } = useSegments();
  const segments = segmentsData?.data ?? [];

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('learner');
  const [jobTitle, setJobTitle] = useState('');
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);

  // UI state
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email format';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    createUserMutation.mutate(
      { name: name.trim(), email: email.trim(), role },
      {
        onSuccess: async (response) => {
          setCreatedUserId(response.id);

          // Assign selected segments
          if (selectedSegments.length > 0) {
            for (const segmentId of selectedSegments) {
              try {
                await createAssignmentMutation.mutateAsync({
                  user_id: response.id,
                  segment_id: segmentId,
                });
              } catch {
                // Continue with other assignments even if one fails
              }
            }
          }

          setShowSuccess(true);
        },
      }
    );
  };

  const toggleSegment = (segmentId: string) => {
    setSelectedSegments((prev) =>
      prev.includes(segmentId)
        ? prev.filter((id) => id !== segmentId)
        : [...prev, segmentId]
    );
  };

  return (
    <div className="py-4 lg:px-8">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/users')}
          className="rounded-lg p-2 text-muted-500 hover:bg-muted-100 hover:text-navy transition-colors"
          aria-label="Back to users"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-heading-page text-navy">Create User</h1>
        </div>
      </div>
      <div className="border-b border-muted-200 mb-6" />

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-8 max-w-2xl space-y-8">
        {/* User Information */}
        <div className="rounded-xl border border-muted-200 bg-white p-6">
          <h2 className="text-heading-card text-navy">User Information</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-helper font-medium text-muted-700">
                Full Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`mt-1.5 w-full rounded-xl border bg-white px-4 py-2.5 text-body text-muted-800 placeholder:text-muted-400 focus:outline-none focus:ring-1 transition-colors ${
                  formErrors.name
                    ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500'
                    : 'border-muted-200 focus:border-primary focus:ring-primary'
                }`}
                placeholder="Enter full name"
              />
              {formErrors.name && (
                <p className="mt-1 text-helper text-danger-500">{formErrors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-helper font-medium text-muted-700">
                Email Address *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-1.5 w-full rounded-xl border bg-white px-4 py-2.5 text-body text-muted-800 placeholder:text-muted-400 focus:outline-none focus:ring-1 transition-colors ${
                  formErrors.email
                    ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500'
                    : 'border-muted-200 focus:border-primary focus:ring-primary'
                }`}
                placeholder="Enter email address"
              />
              {formErrors.email && (
                <p className="mt-1 text-helper text-danger-500">{formErrors.email}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-helper font-medium text-muted-700">
                Role *
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="mt-1.5 w-full appearance-none rounded-xl border border-muted-200 bg-white px-4 py-2.5 text-body text-muted-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Job Title */}
            <div>
              <label htmlFor="jobTitle" className="block text-helper font-medium text-muted-700">
                Job Title
              </label>
              <select
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="mt-1.5 w-full appearance-none rounded-xl border border-muted-200 bg-white px-4 py-2.5 text-body text-muted-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              >
                <option value="">Select job title</option>
                {JOB_TITLE_OPTIONS.map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Segment Assignment */}
        <div className="rounded-xl border border-muted-200 bg-white p-6">
          <h2 className="text-heading-card text-navy">Segment Assignment</h2>
          <p className="mt-1 text-helper text-muted-500">
            Assign the user to one or more learning segments.
          </p>
          <div className="mt-4 max-h-60 space-y-2 overflow-y-auto">
            {segments && segments.length > 0 ? (
              segments
                .filter((s) => s.status === 'active')
                .map((segment) => (
                  <label
                    key={segment.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-muted-200 p-3 hover:bg-muted-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSegments.includes(segment.id)}
                      onChange={() => toggleSegment(segment.id)}
                      className="h-4 w-4 rounded border-muted-300 text-teal focus:ring-primary"
                    />
                    <div className="flex-1">
                      <p className="text-body font-medium text-navy">{segment.title}</p>
                      {segment.description && (
                        <p className="text-helper text-muted-500 line-clamp-1">
                          {segment.description}
                        </p>
                      )}
                    </div>
                  </label>
                ))
            ) : (
              <p className="text-helper text-muted-500 py-4 text-center">
                No active segments available.
              </p>
            )}
          </div>
        </div>

        {/* Error */}
        {createUserMutation.error && (
          <ErrorMessage message={createUserMutation.error.message} />
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            className="rounded-xl border border-muted-200 px-5 py-2.5 text-body font-medium text-muted-700 hover:bg-muted-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createUserMutation.isPending}
            className="rounded-xl bg-secondary px-5 py-2.5 text-body font-medium text-white hover:bg-secondary/90 disabled:opacity-50 transition-colors"
          >
            {createUserMutation.isPending ? (
              <span className="flex items-center gap-2">
                <LoadingIndicator size="sm" />
                Creating...
              </span>
            ) : (
              'Create User & Send Invite'
            )}
          </button>
        </div>
      </form>

      {/* Success Modal */}
      <SuccessModal
        open={showSuccess}
        onOpenChange={setShowSuccess}
        title="User Created Successfully"
        description="An invite email has been sent to the user."
        actionLabel="Assign Training Now"
        onAction={() => {
          setShowSuccess(false);
          if (createdUserId) {
            navigate(`/admin/assign-training?userId=${createdUserId}`);
          }
        }}
        secondaryActionLabel="Go to User List"
        onSecondaryAction={() => {
          setShowSuccess(false);
          navigate('/admin/users');
        }}
      />
    </div>
  );
}
