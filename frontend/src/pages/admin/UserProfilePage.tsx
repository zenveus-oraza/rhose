import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail, UserX, BookOpen } from 'lucide-react';
import {
  useDeactivateUser,
  useResetUserPassword,
  useUpdateUser,
  useUserAssignments,
  useUserBySlug,
} from '@/hooks/useAdminApi';
import {
  StatusBadge,
  LoadingIndicator,
  ErrorMessage,
  ConfirmationDialog,
  SuccessModal,
} from '@/components/shared';
import { ProfileImageUpload } from '@/components/ui/ProfileImageUpload';
import { useToast } from '@/components/ui/Toast';
import { uploadImage } from '@/services/upload.service';
import type { UpdateUserInput, UserAssignment } from '@/types/admin';

export function UserProfilePage() {
  const { userSlug } = useParams<{ userSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: user, isLoading: userLoading, error: userError } = useUserBySlug(userSlug || '');
  const { data: assignmentsData, isLoading: assignmentsLoading } = useUserAssignments(user?.id || '', { limit: 100 });
  const deactivateMutation = useDeactivateUser();
  const resetPasswordMutation = useResetUserPassword();
  const updateUserMutation = useUpdateUser();

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'learner'>('learner');
  const [editProfileImage, setEditProfileImage] = useState<string | null>(null);

  // Initialize edit form when user loads
  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditEmail(user.email);
      setEditPhone(user.phone || '');
      setEditJobTitle(user.jobTitle || '');
      setEditRole(user.role as 'admin' | 'learner');
      setEditProfileImage(user.profileImage || null);
    }
  }, [user]);

  const handleResetPassword = () => {
    if (!user?.id) return;
    resetPasswordMutation.mutate(user.id, {
      onSuccess: (response) => {
        setTempPassword(response.temporaryPassword);
        setShowResetSuccess(true);
      },
    });
  };

  const handleDeactivate = () => {
    if (!user?.id) return;
    deactivateMutation.mutate(user.id, {
      onSuccess: () => {
        setShowDeactivateConfirm(false);
      },
    });
  };

  const handleImageUpload = async (file: File) => {
    try {
      const uploaded = await uploadImage(file);
      setEditProfileImage(uploaded.url);
      toast('success', 'Profile photo uploaded');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload image';
      toast('error', message);
      throw error;
    }
  };

  const handleSaveEdits = () => {
    if (!user?.id) return;

    const updateData: UpdateUserInput = {};
    if (editName !== user?.name) updateData.name = editName;
    if (editRole !== user?.role) updateData.role = editRole;
    if (editPhone !== (user?.phone || '')) updateData.phone = editPhone || null;
    if (editJobTitle !== (user?.jobTitle || '')) updateData.jobTitle = editJobTitle || null;
    if (editProfileImage !== (user?.profileImage || null)) updateData.profileImage = editProfileImage;

    updateUserMutation.mutate(
      {
        id: user.id,
        data: updateData,
      },
      {
        onSuccess: () => {
          toast('success', 'User profile updated successfully');
          setIsEditing(false);
        },
        onError: (error) => {
          toast('error', error.message || 'Failed to update user');
        },
      }
    );
  };

  const handleCancelEdits = () => {
    if (user) {
      setEditName(user.name);
      setEditEmail(user.email);
      setEditPhone(user.phone || '');
      setEditJobTitle(user.jobTitle || '');
      setEditRole(user.role as 'admin' | 'learner');
      setEditProfileImage(user.profileImage || null);
    }
    setIsEditing(false);
  };

  if (userLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingIndicator label="Loading user profile..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-4 lg:px-8">
        <ErrorMessage message={userError?.message || 'User not found.'} />
      </div>
    );
  }

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
        <div className="flex-1">
          <h1 className="text-heading-page text-navy">User Profile</h1>
        </div>
      </div>
      <div className="border-b border-muted-200 mb-6" />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* User Details Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-muted-200 bg-white p-6">
            {!isEditing ? (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start gap-4">
                    {/* Profile Image */}
                    {user.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt={user.name}
                        loading="lazy"
                        className="h-14 w-14 rounded-full object-cover border-2 border-muted-200"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-primary text-heading-card font-bold border-2 border-muted-200">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h2 className="text-heading-card text-navy">{user.name}</h2>
                          {user.jobTitle && (
                            <p className="text-body text-primary font-medium">{user.jobTitle}</p>
                          )}
                        </div>
                        <StatusBadge status={user.status} />
                      </div>
                      <p className="mt-1 text-body text-muted-500">{user.email}</p>
                      <p className="text-helper text-muted-400 capitalize">{user.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="rounded-lg border border-muted-200 px-4 py-2 text-helper font-medium text-navy hover:bg-muted-50 transition-colors"
                  >
                    Edit Profile
                  </button>
                </div>

                {/* User Info Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-helper font-medium text-muted-500">Full Name</p>
                    <p className="mt-0.5 text-body text-navy">{user.name}</p>
                  </div>
                  <div>
                    <p className="text-helper font-medium text-muted-500">Email</p>
                    <p className="mt-0.5 text-body text-navy">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-helper font-medium text-muted-500">Phone</p>
                    <p className="mt-0.5 text-body text-navy">{user.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-helper font-medium text-muted-500">Job Title</p>
                    <p className="mt-0.5 text-body text-navy">{user.jobTitle || '-'}</p>
                  </div>
                  <div>
                    <p className="text-helper font-medium text-muted-500">Role</p>
                    <p className="mt-0.5 text-body text-navy capitalize">{user.role}</p>
                  </div>
                  <div>
                    <p className="text-helper font-medium text-muted-500">Status</p>
                    <StatusBadge status={user.status} className="mt-0.5" />
                  </div>
                  <div>
                    <p className="text-helper font-medium text-muted-500">Created</p>
                    <p className="mt-0.5 text-body text-navy">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-helper font-medium text-muted-500">Last Updated</p>
                    <p className="mt-0.5 text-body text-navy">
                      {new Date(user.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-heading-card text-navy">Edit User Profile</h2>
                </div>

                <form className="space-y-6">
                  {/* Profile Picture */}
                  <div>
                    <label className="block text-helper font-medium text-navy mb-3">Profile Picture</label>
                    <div className="flex items-end gap-4">
                      {editProfileImage ? (
                        <img
                          src={editProfileImage}
                          alt={editName}
                          loading="lazy"
                          className="h-16 w-16 rounded-full object-cover border-2 border-muted-200"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-primary text-body font-bold border-2 border-muted-200">
                          {editName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <ProfileImageUpload
                        currentImage={editProfileImage}
                        onUpload={handleImageUpload}
                        trigger={
                          <button
                            type="button"
                            className="rounded-lg border border-muted-200 px-4 py-2 text-helper font-medium text-navy hover:bg-muted-50 transition-colors"
                          >
                            Change Picture
                          </button>
                        }
                      />
                    </div>
                  </div>

                  {/* Name and Email (side by side) */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="edit-name" className="block text-helper font-medium text-navy mb-1">
                        Full Name
                      </label>
                      <input
                        id="edit-name"
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-lg border border-muted-300 px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-email" className="block text-helper font-medium text-navy mb-1">
                        Email (Read-only)
                      </label>
                      <input
                        id="edit-email"
                        type="email"
                        value={editEmail}
                        disabled
                        className="w-full rounded-lg border border-muted-200 bg-muted-50 px-4 py-2.5 text-body text-muted-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Phone and Job Title */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="edit-phone" className="block text-helper font-medium text-navy mb-1">
                        Phone
                      </label>
                      <input
                        id="edit-phone"
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full rounded-lg border border-muted-300 px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-job-title" className="block text-helper font-medium text-navy mb-1">
                        Job Title
                      </label>
                      <select
                        id="edit-job-title"
                        value={editJobTitle}
                        onChange={(e) => setEditJobTitle(e.target.value)}
                        className="w-full rounded-lg border border-muted-300 px-4 py-2.5 text-body text-navy focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Select job title</option>
                        <option value="Dental Hygienist">Dental Hygienist</option>
                        <option value="Dental Assistant">Dental Assistant</option>
                        <option value="Practice Manager">Practice Manager</option>
                        <option value="Associate Dentist">Associate Dentist</option>
                        <option value="Lead Dentist">Lead Dentist</option>
                        <option value="Clinical Director">Clinical Director</option>
                        <option value="Sterilization Technician">Sterilization Technician</option>
                        <option value="Lab Technician">Lab Technician</option>
                        <option value="Dental Practitioner">Dental Practitioner</option>
                      </select>
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <label htmlFor="edit-role" className="block text-helper font-medium text-navy mb-1">
                      Role
                    </label>
                    <select
                      id="edit-role"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as 'admin' | 'learner')}
                      className="w-full rounded-lg border border-muted-300 px-4 py-2.5 text-body text-navy focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="admin">Admin</option>
                      <option value="learner">Learner</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-end pt-4">
                    <button
                      type="button"
                      onClick={handleCancelEdits}
                      className="rounded-lg border border-muted-200 px-6 py-2.5 text-helper font-medium text-navy hover:bg-muted-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdits}
                      disabled={updateUserMutation.isPending}
                      className="rounded-lg bg-secondary px-6 py-2.5 text-helper font-medium text-white hover:bg-secondary/90 disabled:opacity-50 transition-colors"
                    >
                      {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          {/* Segment Assignments Section */}
          {user.role === 'learner' && (
            <div className="rounded-xl border border-muted-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-heading-card text-navy flex items-center gap-2">
                  <BookOpen size={20} className="text-primary" />
                  Segment Assignments
                </h3>
                <button
                  onClick={() => navigate(`/admin/assign-training?userId=${user.id}`)}
                  className="rounded-lg border border-muted-200 px-4 py-2 text-helper font-medium text-navy hover:bg-muted-50 transition-colors"
                >
                  Assign Training
                </button>
              </div>

              {assignmentsLoading ? (
                <div className="flex justify-center py-6">
                  <LoadingIndicator size="sm" label="Loading assignments..." />
                </div>
              ) : assignmentsData?.data && assignmentsData.data.length > 0 ? (
                <div className="space-y-2">
                  {assignmentsData.data.map((assignment: UserAssignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between rounded-lg border border-muted-200 p-3 hover:bg-muted-50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-body font-medium text-navy">{assignment.title}</p>
                        <p className="text-helper text-muted-500">
                          Assigned on {new Date(assignment.assignedAt).toLocaleDateString()}
                        </p>
                        {assignment.accessDurationDays && (
                          <p className="text-helper text-muted-500">
                            Access: {assignment.accessDurationDays} days
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-helper font-medium text-primary capitalize">
                          {assignment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-helper text-muted-500">
                  No segments assigned yet.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Quick Actions & Account Details */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-xl border border-muted-200 bg-white p-6">
            <h3 className="text-heading-card text-navy">Quick Actions</h3>
            <div className="mt-4 space-y-2">
              <button
                onClick={handleResetPassword}
                disabled={resetPasswordMutation.isPending}
                className="flex w-full items-center gap-2.5 rounded-lg border border-muted-200 px-4 py-2.5 text-helper font-medium text-navy hover:bg-muted-50 disabled:opacity-50 transition-colors"
              >
                <KeyRound size={16} className="text-warning" />
                Reset Password
              </button>
              <button
                className="flex w-full items-center gap-2.5 rounded-lg border border-muted-200 px-4 py-2.5 text-helper font-medium text-navy hover:bg-muted-50 transition-colors"
                disabled
              >
                <Mail size={16} className="text-muted-400" />
                Send Invite Email
              </button>
              <button
                onClick={() => setShowDeactivateConfirm(true)}
                disabled={user.status === 'deactivated'}
                className="flex w-full items-center gap-2.5 rounded-lg border border-danger-200 px-4 py-2.5 text-helper font-medium text-danger-600 hover:bg-danger-50 disabled:opacity-50 transition-colors"
              >
                <UserX size={16} />
                Deactivate User
              </button>
            </div>
          </div>

          {/* Account Details */}
          <div className="rounded-xl border border-muted-200 bg-white p-6">
            <h3 className="text-heading-card text-navy">Account Details</h3>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-helper text-muted-500">Account Status</p>
                <StatusBadge status={user.status} className="mt-0.5" />
              </div>
              <div>
                <p className="text-helper text-muted-500">Member Since</p>
                <p className="mt-0.5 text-body text-navy">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deactivate Confirmation */}
      <ConfirmationDialog
        open={showDeactivateConfirm}
        onOpenChange={setShowDeactivateConfirm}
        title="Deactivate User"
        description={`Are you sure you want to deactivate ${user.name}? They will no longer be able to access the platform.`}
        confirmLabel="Deactivate"
        onConfirm={handleDeactivate}
        isLoading={deactivateMutation.isPending}
        variant="danger"
      />

      {/* Reset Password Success */}
      <SuccessModal
        open={showResetSuccess}
        onOpenChange={(open) => {
          setShowResetSuccess(open);
          if (!open) setTempPassword(null);
        }}
        title="Password Reset Successfully"
        description={
          tempPassword
            ? `New temporary password: ${tempPassword}`
            : undefined
        }
        actionLabel="Done"
      />
    </div>
  );
}
