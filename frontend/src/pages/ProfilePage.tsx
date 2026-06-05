import { useState, useEffect, type FormEvent } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { apiClient, ApiError } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { ProfileImageUpload } from '@/components/ui/ProfileImageUpload';
import { useToast } from '@/components/ui/Toast';

const profileFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  jobTitle: z.string().max(100, 'Job title must be at most 100 characters').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
});

interface ProfileData {
  name: string;
  email: string;
  role: string;
  jobTitle?: string;
  phone?: string;
  profileImage?: string | null;
}

export function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const { toast } = useToast();

  // Profile tab state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // Refresh profile data when navigating to this page or after login
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Sync local form state when user data updates (e.g., after profile fetch completes)
  useEffect(() => {
    if (user && !isEditing) {
      setName(user.name ?? '');
      setEmail(user.email ?? '');
      setJobTitle(user.jobTitle ?? '');
      setPhone(user.phone ?? '');
    }
  }, [user, isEditing]);

  // Password tab state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});

  const avatarSrc = user?.profileImage || null;

  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  async function handleImageUpload(file: File) {
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve) => {
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
    try {
      await apiClient<ProfileData>('/users/profile', {
        method: 'PATCH',
        body: JSON.stringify({ profileImage: base64 }),
      });
      toast('success', 'Profile photo updated');
      await refreshUser();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to upload image';
      toast('error', message);
      throw err;
    }
  }

  function handleEditToggle() {
    if (isEditing) {
      setName(user?.name ?? '');
      setEmail(user?.email ?? '');
      setJobTitle(user?.jobTitle ?? '');
      setPhone(user?.phone ?? '');
      setProfileErrors({});
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  }

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();

    // Validate with Zod
    const result = profileFormSchema.safeParse({ name, email, jobTitle, phone });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setProfileErrors(fieldErrors);
      return;
    }
    setProfileErrors({});
    setProfileLoading(true);

    try {
      await apiClient<ProfileData>('/users/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name, email, jobTitle: jobTitle || undefined, phone: phone || undefined }),
      });
      toast('success', 'Profile updated successfully');
      setIsEditing(false);
      await refreshUser();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update profile.';
      toast('error', message);
    } finally {
      setProfileLoading(false);
    }
  }

  function validatePasswordFields(): boolean {
    const errors: { newPassword?: string; confirmPassword?: string } = {};
    if (newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters.';
    if (newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    if (!validatePasswordFields()) return;

    setPasswordLoading(true);
    try {
      await apiClient<void>('/users/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast('success', 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to change password.';
      toast('error', message);
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="py-4 lg:px-8">
      {/* Cover/splash image */}
      <div className="relative rounded-xl overflow-hidden">
        <img
          src="/images/splash.jpg"
          alt=""
          className="h-32 lg:h-44 w-full object-cover"
        />
      </div>

      {/* Avatar + Name row — avatar overlaps cover (small part in cover, most below) */}
      <div className="relative -mt-5 ml-6 flex items-end gap-4 mb-6">
        {/* Avatar with upload overlay */}
        <ProfileImageUpload
          currentImage={avatarSrc}
          onUpload={handleImageUpload}
          trigger={
            <button className="relative group" aria-label="Change profile picture">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={user?.name}
                  loading="lazy"
                  className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-muted-200 shadow-md">
                  <svg className="h-12 w-12 text-muted-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              )}
              {/* Centered add_a_photo overlay */}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition">
                <img src="/icon/add_a_photo.png" alt="" className="h-6 w-6" />
              </div>
            </button>
          }
        />

        {/* Name + job title + join date */}
        <div className="pb-1">
          <h2 className="text-heading-card text-navy">{user?.name}</h2>
          {user?.jobTitle && (
            <p className="text-helper text-primary font-medium">{user.jobTitle}</p>
          )}
          {joinDate && (
            <p className="text-helper text-muted-500">Joined {joinDate}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="profile" className="w-full">
        <Tabs.List className="flex w-full border-b border-muted-200 mb-6">
          <Tabs.Trigger
            value="profile"
            className="flex-1 lg:flex-none px-6 py-3 text-body font-medium text-muted-500 border-b-2 border-transparent data-[state=active]:text-navy data-[state=active]:border-navy transition-colors"
          >
            Profile
          </Tabs.Trigger>
          <Tabs.Trigger
            value="password"
            className="flex-1 lg:flex-none px-6 py-3 text-body font-medium text-muted-500 border-b-2 border-transparent data-[state=active]:text-navy data-[state=active]:border-navy transition-colors"
          >
            Password
          </Tabs.Trigger>
        </Tabs.List>

        {/* Profile Tab Content */}
        <Tabs.Content value="profile">
          <div className="rounded-xl border border-muted-200 bg-white p-6 shadow-sm">
            <form onSubmit={handleProfileSave}>
              {/* 2 fields per row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Name field */}
                <div>
                  <label htmlFor="profile-name" className="block text-helper font-medium text-navy mb-1">
                    Name
                  </label>
                  {isEditing ? (
                    <>
                      <input
                        id="profile-name"
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setProfileErrors((prev) => ({ ...prev, name: undefined! }));
                        }}
                        className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-1 ${
                          profileErrors.name
                            ? 'border-danger focus:border-danger focus:ring-danger'
                            : 'border-muted-300 focus:border-primary focus:ring-primary'
                        }`}
                        required
                      />
                      {profileErrors.name && (
                        <p className="mt-1 text-helper text-danger">{profileErrors.name}</p>
                      )}
                    </>
                  ) : (
                    <p className="rounded-lg border border-muted-200 bg-muted-50 px-4 py-2.5 text-body text-navy">
                      {user?.name}
                    </p>
                  )}
                </div>

                {/* Email field */}
                <div>
                  <label htmlFor="profile-email" className="block text-helper font-medium text-navy mb-1">
                    Email
                  </label>
                  {isEditing ? (
                    <>
                      <input
                        id="profile-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setProfileErrors((prev) => ({ ...prev, email: undefined! }));
                        }}
                        className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-1 ${
                          profileErrors.email
                            ? 'border-danger focus:border-danger focus:ring-danger'
                            : 'border-muted-300 focus:border-primary focus:ring-primary'
                        }`}
                        required
                      />
                      {profileErrors.email && (
                        <p className="mt-1 text-helper text-danger">{profileErrors.email}</p>
                      )}
                    </>
                  ) : (
                    <p className="rounded-lg border border-muted-200 bg-muted-50 px-4 py-2.5 text-body text-navy">
                      {user?.email}
                    </p>
                  )}
                </div>

                {/* Role (always read-only) */}
                <div>
                  <label className="block text-helper font-medium text-navy mb-1">
                    Role
                  </label>
                  <p className="rounded-lg border border-muted-200 bg-muted-50 px-4 py-2.5 text-body text-navy capitalize">
                    {user?.role}
                  </p>
                </div>

                {/* Phone field */}
                <div>
                  <label htmlFor="profile-phone" className="block text-helper font-medium text-navy mb-1">
                    Phone
                  </label>
                  {isEditing ? (
                    <>
                      <input
                        id="profile-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          setProfileErrors((prev) => ({ ...prev, phone: undefined! }));
                        }}
                        placeholder="+1 234 567 8900"
                        className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-1 ${
                          profileErrors.phone
                            ? 'border-danger focus:border-danger focus:ring-danger'
                            : 'border-muted-300 focus:border-primary focus:ring-primary'
                        }`}
                      />
                      {profileErrors.phone && (
                        <p className="mt-1 text-helper text-danger">{profileErrors.phone}</p>
                      )}
                    </>
                  ) : (
                    <p className="rounded-lg border border-muted-200 bg-muted-50 px-4 py-2.5 text-body text-navy">
                      {user?.phone || '-'}
                    </p>
                  )}
                </div>

                {/* Job Title field */}
                <div>
                  <label htmlFor="profile-job-title" className="block text-helper font-medium text-navy mb-1">
                    Job Title
                  </label>
                  {isEditing ? (
                    <>
                      <select
                        id="profile-job-title"
                        value={jobTitle}
                        onChange={(e) => {
                          setJobTitle(e.target.value);
                          setProfileErrors((prev) => ({ ...prev, jobTitle: undefined! }));
                        }}
                        className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy focus:outline-none focus:ring-1 ${
                          profileErrors.jobTitle
                            ? 'border-danger focus:border-danger focus:ring-danger'
                            : 'border-muted-300 focus:border-primary focus:ring-primary'
                        }`}
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
                      {profileErrors.jobTitle && (
                        <p className="mt-1 text-helper text-danger">{profileErrors.jobTitle}</p>
                      )}
                    </>
                  ) : (
                    <p className="rounded-lg border border-muted-200 bg-muted-50 px-4 py-2.5 text-body text-navy">
                      {user?.jobTitle || '-'}
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                {isEditing ? (
                  <>
                    <Button variant="outline" type="button" onClick={handleEditToggle}>
                      Cancel
                    </Button>
                    <Button type="submit" isLoading={profileLoading}>
                      {profileLoading ? 'Saving...' : 'Save'}
                    </Button>
                  </>
                ) : (
                  <Button type="button" onClick={handleEditToggle}>
                    Edit
                  </Button>
                )}
              </div>
            </form>
          </div>
        </Tabs.Content>

        {/* Password Tab Content */}
        <Tabs.Content value="password">
          <div className="rounded-xl border border-muted-200 bg-white p-6 shadow-sm">
            <form onSubmit={handlePasswordChange}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Current password */}
                <div>
                  <label htmlFor="current-password" className="block text-helper font-medium text-navy mb-1">
                    Current Password
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-muted-300 px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                {/* Spacer for grid alignment */}
                <div className="hidden lg:block" />

                {/* New password */}
                <div>
                  <label htmlFor="new-password" className="block text-helper font-medium text-navy mb-1">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordErrors((prev) => ({ ...prev, newPassword: undefined }));
                    }}
                    className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-1 ${
                      passwordErrors.newPassword
                        ? 'border-danger focus:border-danger focus:ring-danger'
                        : 'border-muted-300 focus:border-primary focus:ring-primary'
                    }`}
                    required
                  />
                  {passwordErrors.newPassword && (
                    <p className="mt-1 text-helper text-danger">{passwordErrors.newPassword}</p>
                  )}
                </div>

                {/* Confirm new password */}
                <div>
                  <label htmlFor="confirm-password" className="block text-helper font-medium text-navy mb-1">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }}
                    className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-1 ${
                      passwordErrors.confirmPassword
                        ? 'border-danger focus:border-danger focus:ring-danger'
                        : 'border-muted-300 focus:border-primary focus:ring-primary'
                    }`}
                    required
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="mt-1 text-helper text-danger">{passwordErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row sm:justify-end">
                <Button type="submit" isLoading={passwordLoading}>
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Mobile logout button */}
      <div className="mt-8 lg:hidden">
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-danger-200 bg-danger-50 px-6 py-3 text-body font-medium text-danger hover:bg-danger-100 transition-colors"
        >
          <img src="/icon/logout.png" alt="" className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
