import { useState, type FormEvent } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { useAuth } from '@/context/AuthContext';
import { apiClient, ApiError } from '@/services/api';

interface ProfileData {
  name: string;
  email: string;
  role: string;
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

export function ProfilePage() {
  const { user, logout } = useAuth();

  // Profile tab state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<FeedbackState | null>(null);

  // Password tab state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<FeedbackState | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  function handleEditToggle() {
    if (isEditing) {
      // Cancel: reset fields
      setName(user?.name ?? '');
      setEmail(user?.email ?? '');
      setIsEditing(false);
      setProfileFeedback(null);
    } else {
      setIsEditing(true);
      setProfileFeedback(null);
    }
  }

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileFeedback(null);

    try {
      await apiClient<ProfileData>('/users/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name, email }),
      });
      setProfileFeedback({ type: 'success', message: 'Profile updated successfully.' });
      setIsEditing(false);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to update profile.';
      setProfileFeedback({ type: 'error', message });
    } finally {
      setProfileLoading(false);
    }
  }

  function validatePasswordFields(): boolean {
    const errors: { newPassword?: string; confirmPassword?: string } = {};

    if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters.';
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!validatePasswordFields()) {
      return;
    }

    setPasswordLoading(true);

    try {
      await apiClient<void>('/users/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordFeedback({ type: 'success', message: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to change password.';
      setPasswordFeedback({ type: 'error', message });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-heading-page text-navy mb-6">Profile</h1>

      {/* Cover image area */}
      <div className="relative mb-16 rounded-xl overflow-hidden">
        <div className="h-32 lg:h-44 bg-gradient-to-r from-primary via-primary to-primary/80" />

        {/* Avatar */}
        <div className="absolute -bottom-12 left-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-primary text-white text-heading-section shadow-md">
            {userInitials}
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-heading-card text-navy">{user?.name}</span>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-helper font-medium text-primary capitalize">
          {user?.role}
        </span>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="profile" className="w-full">
        <Tabs.List className="flex w-full border-b border-muted-200 mb-6">
          <Tabs.Trigger
            value="profile"
            className="flex-1 lg:flex-none px-6 py-3 text-body font-medium text-muted-500 border-b-2 border-transparent data-[state=active]:text-navy data-[state=active]:border-primary transition-colors"
          >
            Profile
          </Tabs.Trigger>
          <Tabs.Trigger
            value="password"
            className="flex-1 lg:flex-none px-6 py-3 text-body font-medium text-muted-500 border-b-2 border-transparent data-[state=active]:text-navy data-[state=active]:border-primary transition-colors"
          >
            Password
          </Tabs.Trigger>
        </Tabs.List>

        {/* Profile Tab Content */}
        <Tabs.Content value="profile">
          <div className="rounded-xl border border-muted-200 bg-white p-6 shadow-sm">
            {profileFeedback && (
              <div
                className={`mb-4 rounded-lg px-4 py-3 text-helper ${
                  profileFeedback.type === 'success'
                    ? 'bg-success-50 text-success-700'
                    : 'bg-danger-50 text-danger-700'
                }`}
                role="alert"
              >
                {profileFeedback.message}
              </div>
            )}

            <form onSubmit={handleProfileSave}>
              <div className="space-y-4">
                {/* Name field */}
                <div>
                  <label htmlFor="profile-name" className="block text-helper font-medium text-navy mb-1">
                    Name
                  </label>
                  {isEditing ? (
                    <input
                      id="profile-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-muted-300 px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                    />
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
                    <input
                      id="profile-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-muted-300 px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                    />
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
              </div>

              {/* Action buttons */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleEditToggle}
                      className="rounded-lg border border-muted-300 px-6 py-2.5 text-body font-medium text-muted-600 hover:bg-muted-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="rounded-lg bg-primary px-6 py-2.5 text-body font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {profileLoading ? 'Saving...' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleEditToggle}
                    className="rounded-lg bg-primary px-6 py-2.5 text-body font-medium text-white hover:bg-primary/90 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            </form>
          </div>
        </Tabs.Content>

        {/* Password Tab Content */}
        <Tabs.Content value="password">
          <div className="rounded-xl border border-muted-200 bg-white p-6 shadow-sm">
            {passwordFeedback && (
              <div
                className={`mb-4 rounded-lg px-4 py-3 text-helper ${
                  passwordFeedback.type === 'success'
                    ? 'bg-success-50 text-success-700'
                    : 'bg-danger-50 text-danger-700'
                }`}
                role="alert"
              >
                {passwordFeedback.message}
              </div>
            )}

            <form onSubmit={handlePasswordChange}>
              <div className="space-y-4">
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
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="rounded-lg bg-primary px-6 py-2.5 text-body font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </button>
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
