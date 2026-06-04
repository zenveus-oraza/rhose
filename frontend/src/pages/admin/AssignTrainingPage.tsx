import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Bell } from 'lucide-react';
import {
  useSegments,
  useUsers,
  useCreateAssignment,
  useSegmentAssignments,
} from '@/hooks/useAdminApi';
import { LoadingIndicator, ErrorMessage, SuccessModal } from '@/components/shared';
import type { UserProfile, Segment } from '@/types/admin';

export function AssignTrainingPage() {
  const navigate = useNavigate();

  // Segment selection
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const { data: segmentsData, isLoading: segmentsLoading } = useSegments({ limit: 100 });

  // Users list with pagination for infinite scroll
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [jobTitleFilter, setJobTitleFilter] = useState('');
  const { data: usersData, isLoading: usersLoading } = useUsers({
    page: userPage,
    limit: 50,
    search: userSearch || undefined,
  });

  // Get existing assignments for selected segment to filter out already-assigned users
  const { data: existingAssignments } = useSegmentAssignments(
    selectedSegment?.id ?? '',
    { limit: 200 }
  );

  const createAssignmentMutation = useCreateAssignment();

  // Form state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [sendNotification, setSendNotification] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // UI state
  const [showSuccess, setShowSuccess] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Accumulated users from all loaded pages (for infinite scroll)
  const [allLoadedUsers, setAllLoadedUsers] = useState<UserProfile[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset loaded users on search/filter change
  useEffect(() => {
    setUserPage(1);
    setAllLoadedUsers([]);
  }, [userSearch, jobTitleFilter]);

  // Append new page data
  useEffect(() => {
    if (usersData?.data) {
      if (userPage === 1) {
        setAllLoadedUsers(usersData.data);
      } else {
        setAllLoadedUsers((prev) => {
          const existingIds = new Set(prev.map((u) => u.id));
          const newUsers = usersData.data.filter((u) => !existingIds.has(u.id));
          return [...prev, ...newUsers];
        });
      }
    }
  }, [usersData?.data, userPage]);

  // Filter users: remove already-assigned, apply job title filter
  const filteredUsers = useMemo(() => {
    const assignedUserIds = new Set(
      existingAssignments?.data?.map((a) => a.userId) ?? []
    );

    return allLoadedUsers
      .filter((u) => u.status === 'active' && u.role === 'learner')
      .filter((u) => !assignedUserIds.has(u.id))
      .filter((u) => {
        if (!jobTitleFilter) return true;
        return u.jobTitle?.toLowerCase().includes(jobTitleFilter.toLowerCase());
      });
  }, [allLoadedUsers, existingAssignments?.data, jobTitleFilter]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || usersLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      if (usersData?.pagination && userPage < usersData.pagination.totalPages) {
        setUserPage((p) => p + 1);
      }
    }
  }, [usersLoading, usersData?.pagination, userPage]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleAssign = async () => {
    if (!selectedSegment || selectedUserIds.size === 0) return;

    setIsAssigning(true);
    setAssignError(null);

    try {
      for (const userId of selectedUserIds) {
        await createAssignmentMutation.mutateAsync({
          user_id: userId,
          segment_id: selectedSegment.id,
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

  const activeSegments = segmentsData?.data?.filter((s) => s.status === 'active') ?? [];

  return (
    <div className="py-4 lg:px-8">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-muted-500 hover:bg-muted-100 hover:text-navy transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-navy">Assign Training</h1>
        </div>
      </div>
      <div className="border-b border-muted-200 mb-6" />

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        {/* Left Column: Segment + Assign Button */}
        <div className="space-y-6">
          {/* Select Segment */}
          <div className="rounded-xl border border-muted-200 bg-white p-6">
            <h2 className="text-base font-semibold text-navy">Select Segment</h2>
            <p className="mt-1 text-helper text-muted-500">
              Choose the segment to assign users to.
            </p>
            {segmentsLoading ? (
              <div className="mt-4">
                <LoadingIndicator size="sm" />
              </div>
            ) : (
              <select
                value={selectedSegment?.id ?? ''}
                onChange={(e) => {
                  const seg = activeSegments.find((s) => s.id === e.target.value) ?? null;
                  setSelectedSegment(seg);
                  setSelectedUserIds(new Set());
                }}
                className="mt-3 w-full rounded-lg border border-muted-200 bg-white px-4 py-2.5 text-sm text-navy focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              >
                <option value="">— Select a segment —</option>
                {activeSegments.map((seg) => (
                  <option key={seg.id} value={seg.id}>
                    {seg.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Error */}
          {assignError && <ErrorMessage message={assignError} />}

          {/* Notification */}
          <div className="rounded-xl border border-muted-200 bg-white p-6">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setSendNotification(!sendNotification)}>
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-muted-500" />
                <span className="text-helper font-medium text-muted-700">
                  Notify Users Via Email
                </span>
              </div>
              <div
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  sendNotification ? 'bg-teal' : 'bg-muted-300'
                }`}
                role="switch"
                aria-checked={sendNotification}
              >
                <div
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    sendNotification ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </div>

            {sendNotification && (
              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="email-subject" className="block text-helper font-medium text-muted-700 mb-1">
                    Subject
                  </label>
                  <input
                    id="email-subject"
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Training assignment notification"
                    className="w-full rounded-lg border border-muted-200 bg-white px-4 py-2 text-sm text-navy placeholder:text-muted-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="email-body" className="block text-helper font-medium text-muted-700 mb-1">
                    Body
                  </label>
                  <textarea
                    id="email-body"
                    rows={5}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="You have been assigned a new training segment..."
                    className="w-full rounded-lg border border-muted-200 bg-white px-4 py-2 text-sm text-navy placeholder:text-muted-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Assign Button */}
          <button
            onClick={handleAssign}
            disabled={!selectedSegment || selectedUserIds.size === 0 || isAssigning}
            className="w-full rounded-xl bg-secondary px-5 py-3 text-sm font-medium text-white hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAssigning ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingIndicator size="sm" />
                Assigning...
              </span>
            ) : (
              `Assign ${selectedUserIds.size} User${selectedUserIds.size !== 1 ? 's' : ''}`
            )}
          </button>
        </div>

        {/* Right Column: User Selection + Notification */}
        <div className="rounded-xl border border-muted-200 bg-white shadow-sm flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {/* Header */}
          <div className="border-b border-muted-200 px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-navy">Select Users</h2>
              {selectedUserIds.size > 0 && (
                <span className="text-helper font-medium text-teal">
                  {selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-lg border border-muted-200 bg-white py-2 pl-9 pr-4 text-sm text-muted-800 placeholder:text-muted-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
              <input
                type="text"
                placeholder="Filter by job title"
                value={jobTitleFilter}
                onChange={(e) => setJobTitleFilter(e.target.value)}
                className="w-40 rounded-lg border border-muted-200 bg-white px-3 py-2 text-sm text-muted-800 placeholder:text-muted-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          {/* User List with infinite scroll */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto divide-y divide-muted-100"
          >
            {filteredUsers.map((user) => {
              const isSelected = selectedUserIds.has(user.id);
              return (
                <label
                  key={user.id}
                  className={`flex cursor-pointer items-center gap-3 px-6 py-3 transition-colors ${
                    isSelected ? 'bg-teal-50' : 'hover:bg-muted-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleUser(user.id)}
                    className="h-4 w-4 rounded border-muted-300 text-teal focus:ring-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{user.name}</p>
                    <p className="text-helper text-muted-500 truncate">{user.email}</p>
                  </div>
                  {user.jobTitle && (
                    <span className="text-helper text-muted-500 shrink-0">{user.jobTitle}</span>
                  )}
                </label>
              );
            })}

            {usersLoading && (
              <div className="py-4 flex justify-center">
                <LoadingIndicator size="sm" />
              </div>
            )}

            {!usersLoading && filteredUsers.length === 0 && (
              <p className="py-8 text-center text-helper text-muted-500">
                {selectedSegment ? 'No users available for this segment.' : 'Select a segment first to see available users.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        open={showSuccess}
        onOpenChange={setShowSuccess}
        title="Training Assigned Successfully"
        description={`${selectedUserIds.size} user${selectedUserIds.size !== 1 ? 's have' : ' has'} been assigned to the selected segment.`}
        actionLabel="Go to User Management"
        onAction={() => {
          setShowSuccess(false);
          navigate('/admin/users');
        }}
        secondaryActionLabel="Assign More"
        onSecondaryAction={() => {
          setShowSuccess(false);
          setSelectedUserIds(new Set());
          setSelectedSegment(null);
        }}
      />
    </div>
  );
}
