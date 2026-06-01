import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, X, Bell } from 'lucide-react';
import { useSegments, useUsers, useCreateAssignment } from '@/hooks/useAdminApi';
import { LoadingIndicator, ErrorMessage, SuccessModal, StatusBadge } from '@/components/shared';
import type { UserProfile } from '@/types/admin';

export function AssignTrainingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedUserId = searchParams.get('userId');

  const { data: segments, isLoading: segmentsLoading } = useSegments();
  const { data: usersData, isLoading: usersLoading } = useUsers({ limit: 100 });
  const createAssignmentMutation = useCreateAssignment();

  // Form state
  const [selectedSegmentId, setSelectedSegmentId] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>(() => {
    return [];
  });
  const [userSearch, setUserSearch] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
  const [durationDays, setDurationDays] = useState('');
  const [dueDate, setDueDate] = useState('');

  // UI state
  const [showSuccess, setShowSuccess] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Pre-select user if userId is in URL params
  useState(() => {
    if (preselectedUserId && usersData?.data) {
      const user = usersData.data.find((u) => u.id === preselectedUserId);
      if (user && !selectedUsers.find((u) => u.id === user.id)) {
        setSelectedUsers([user]);
      }
    }
  });

  const filteredUsers = useMemo(() => {
    if (!usersData?.data) return [];
    const search = userSearch.toLowerCase();
    return usersData.data
      .filter((u) => u.status === 'active')
      .filter(
        (u) =>
          !search ||
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search)
      );
  }, [usersData?.data, userSearch]);

  const toggleUser = (user: UserProfile) => {
    setSelectedUsers((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const removeUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleAssign = async () => {
    if (!selectedSegmentId || selectedUsers.length === 0) return;

    setIsAssigning(true);
    setAssignError(null);

    try {
      for (const user of selectedUsers) {
        await createAssignmentMutation.mutateAsync({
          user_id: user.id,
          segment_id: selectedSegmentId,
          access_duration_days: durationDays ? parseInt(durationDays, 10) : undefined,
        });
      }
      setShowSuccess(true);
    } catch (err) {
      setAssignError(
        err instanceof Error ? err.message : 'Failed to assign training. Please try again.'
      );
    } finally {
      setIsAssigning(false);
    }
  };

  const activeSegments = segments?.filter((s) => s.status === 'active') ?? [];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-muted-500 hover:bg-muted-100 hover:text-navy transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-heading-page text-navy">Assign Training</h1>
          <p className="mt-1 text-body text-muted-500">
            Assign users to a learning segment.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Left: Segment Selection & User List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Segment Selector */}
          <div className="rounded-xl border border-muted-200 bg-white p-6">
            <h2 className="text-heading-card text-navy">Select Segment</h2>
            <p className="mt-1 text-helper text-muted-500">
              Choose the segment to assign users to.
            </p>
            {segmentsLoading ? (
              <div className="mt-4">
                <LoadingIndicator size="sm" />
              </div>
            ) : (
              <select
                value={selectedSegmentId}
                onChange={(e) => setSelectedSegmentId(e.target.value)}
                className="mt-3 w-full appearance-none rounded-xl border border-muted-200 bg-white px-4 py-2.5 text-body text-muted-800 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal transition-colors"
              >
                <option value="">Select a segment...</option>
                {activeSegments.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.title}
                  </option>
                ))}
              </select>
            )}
            {selectedSegmentId && (
              <div className="mt-2">
                <StatusBadge
                  status={
                    activeSegments.find((s) => s.id === selectedSegmentId)?.status ?? 'active'
                  }
                />
              </div>
            )}
          </div>

          {/* User Selection */}
          <div className="rounded-xl border border-muted-200 bg-white p-6">
            <h2 className="text-heading-card text-navy">Select Users</h2>
            <p className="mt-1 text-helper text-muted-500">
              Choose users to assign to the selected segment.
            </p>

            {/* Search */}
            <div className="relative mt-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-xl border border-muted-200 bg-white py-2.5 pl-9 pr-4 text-helper text-muted-800 placeholder:text-muted-400 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal transition-colors"
              />
            </div>

            {/* User List */}
            {usersLoading ? (
              <div className="mt-4">
                <LoadingIndicator size="sm" />
              </div>
            ) : (
              <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUsers.some((u) => u.id === user.id);
                  return (
                    <label
                      key={user.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        isSelected
                          ? 'border-teal-200 bg-teal-50'
                          : 'border-muted-200 hover:bg-muted-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleUser(user)}
                        className="h-4 w-4 rounded border-muted-300 text-teal focus:ring-teal"
                      />
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-700 text-helper font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-medium text-navy truncate">{user.name}</p>
                        <p className="text-helper text-muted-500 truncate">{user.email}</p>
                      </div>
                      <span className="text-helper text-muted-400 capitalize">{user.role}</span>
                    </label>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <p className="py-4 text-center text-helper text-muted-500">
                    No users found.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Duration & Date */}
          <div className="rounded-xl border border-muted-200 bg-white p-6">
            <h2 className="text-heading-card text-navy">Duration & Schedule</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="duration" className="block text-helper font-medium text-muted-700">
                  Access Duration (days)
                </label>
                <input
                  id="duration"
                  type="number"
                  min="1"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  placeholder="e.g. 30"
                  className="mt-1.5 w-full rounded-xl border border-muted-200 bg-white px-4 py-2.5 text-body text-muted-800 placeholder:text-muted-400 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal transition-colors"
                />
              </div>
              <div>
                <label htmlFor="dueDate" className="block text-helper font-medium text-muted-700">
                  Due Date
                </label>
                <input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-muted-200 bg-white px-4 py-2.5 text-body text-muted-800 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Selected Users Panel & Actions */}
        <div className="space-y-6">
          {/* Selected Users */}
          <div className="rounded-xl border border-muted-200 bg-white p-6">
            <h3 className="text-heading-card text-navy">
              Selected Users ({selectedUsers.length})
            </h3>
            {selectedUsers.length > 0 ? (
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-lg bg-muted-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-helper font-medium text-navy truncate">
                        {user.name}
                      </span>
                    </div>
                    <button
                      onClick={() => removeUser(user.id)}
                      className="shrink-0 rounded p-1 text-muted-400 hover:text-danger-500 transition-colors"
                      aria-label={`Remove ${user.name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-helper text-muted-500">
                No users selected yet.
              </p>
            )}
          </div>

          {/* Notification Toggle */}
          <div className="rounded-xl border border-muted-200 bg-white p-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  sendNotification ? 'bg-teal' : 'bg-muted-300'
                }`}
                onClick={() => setSendNotification(!sendNotification)}
              >
                <div
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    sendNotification ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-muted-500" />
                <span className="text-helper font-medium text-muted-700">
                  Send notification email
                </span>
              </div>
            </label>
            <p className="mt-2 text-helper text-muted-400 ml-14">
              Notify selected users about their new assignment.
            </p>
          </div>

          {/* Error */}
          {assignError && <ErrorMessage message={assignError} />}

          {/* Assign Button */}
          <button
            onClick={handleAssign}
            disabled={!selectedSegmentId || selectedUsers.length === 0 || isAssigning}
            className="w-full rounded-xl bg-navy px-5 py-3 text-body font-medium text-white hover:bg-navy-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAssigning ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingIndicator size="sm" />
                Assigning...
              </span>
            ) : (
              `Assign ${selectedUsers.length} User${selectedUsers.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        open={showSuccess}
        onOpenChange={setShowSuccess}
        title="Training Assigned Successfully"
        description={`${selectedUsers.length} user${selectedUsers.length !== 1 ? 's have' : ' has'} been assigned to the selected segment.`}
        actionLabel="Go to User Management"
        onAction={() => {
          setShowSuccess(false);
          navigate('/admin/users');
        }}
        secondaryActionLabel="Assign More"
        onSecondaryAction={() => {
          setShowSuccess(false);
          setSelectedUsers([]);
          setSelectedSegmentId('');
        }}
      />
    </div>
  );
}
