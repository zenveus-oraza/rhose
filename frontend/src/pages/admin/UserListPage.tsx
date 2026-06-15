import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, KeyRound, UserX, BookOpen } from 'lucide-react';
import { useUsers, useDeactivateUser, useResetUserPassword, useUserAssignments } from '@/hooks/useAdminApi';
import { StatusBadge, ActionMenu, LoadingIndicator, ErrorMessage, ConfirmationDialog, SuccessModal } from '@/components/shared';
import type { ActionMenuItem } from '@/components/shared';
import type { UserProfile } from '@/types/admin';

const STATUS_FILTERS = ['All', 'Active', 'Deactivated'] as const;

// UserTableRow component to handle assignments fetching
function UserTableRow({
  user,
  onNavigate,
  onActionClick,
  actions,
}: {
  user: UserProfile;
  onNavigate: () => void;
  onActionClick: (e: React.MouseEvent) => void;
  actions: ActionMenuItem[];
}) {
  // Fetch assignments for this user
  const { data: assignmentsData } = useUserAssignments(user.id, { limit: 100 });
  const segments = assignmentsData?.data ?? [];
  const segmentTitles = segments.map((s: any) => s.title).slice(0, 2);
  const segmentDisplay = segmentTitles.length > 0 ? segmentTitles.join(', ') : '-';
  const hasMoreSegments = segments.length > 2;

  return (
    <tr
      onClick={onNavigate}
      className="hover:bg-muted-50 transition-colors cursor-pointer"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {user.profileImage ? (
            <img
              src={user.profileImage}
              alt={user.name}
              loading="lazy"
              className="h-9 w-9 rounded-full object-cover border border-muted-200"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-primary font-medium text-helper">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-body font-medium text-navy">{user.name}</p>
            <p className="text-helper text-muted-500">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="text-helper text-muted-700 capitalize font-medium">{user.role}</p>
          {user.jobTitle && (
            <p className="text-helper text-muted-500">{user.jobTitle}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-body font-medium text-navy max-w-xs truncate" title={segmentDisplay}>
          {segmentDisplay}
        </p>
        {hasMoreSegments && (
          <p className="text-helper text-muted-500">+{segments.length - 2} more</p>
        )}
      </td>
      <td className="px-4 py-3">
        <p className="text-helper text-muted-600">-</p>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={user.status} />
      </td>
      <td className="px-4 py-3 text-right" onClick={onActionClick}>
        <ActionMenu items={actions} />
      </td>
    </tr>
  );
}

export function UserListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [page, setPage] = useState(1);

  // Deactivation state
  const [deactivateTarget, setDeactivateTarget] = useState<UserProfile | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  // Reset password state
  const [resetTarget, setResetTarget] = useState<UserProfile | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showResetSuccess, setShowResetSuccess] = useState(false);

  const { data, isLoading, error, refetch } = useUsers({ page, limit: 10, search: search || undefined });
  const deactivateMutation = useDeactivateUser();
  const resetPasswordMutation = useResetUserPassword();

  const filteredUsers = useMemo(() => {
    if (!data?.data) return [];
    if (statusFilter === 'All') return data.data;
    return data.data.filter(
      (u) => u.status.toLowerCase() === statusFilter.toLowerCase()
    );
  }, [data?.data, statusFilter]);

  const handleDeactivate = (user: UserProfile) => {
    setDeactivateTarget(user);
    setShowDeactivateConfirm(true);
  };

  const confirmDeactivate = () => {
    if (!deactivateTarget) return;
    deactivateMutation.mutate(deactivateTarget.id, {
      onSuccess: () => {
        setShowDeactivateConfirm(false);
        setDeactivateTarget(null);
      },
    });
  };

  const handleResetPassword = (user: UserProfile) => {
    setResetTarget(user);
    resetPasswordMutation.mutate(user.id, {
      onSuccess: (response) => {
        setTempPassword(response.temporaryPassword);
        setShowResetSuccess(true);
      },
    });
  };

  const getRowActions = (user: UserProfile): ActionMenuItem[] => [
    {
      label: 'View Profile',
      icon: <BookOpen size={16} />,
      onClick: () => navigate(`/admin/users/${user.slug}`),
    },
    ...(user.role === 'learner' ? [{
      label: 'Assign Segment',
      icon: <BookOpen size={16} />,
      onClick: () => navigate(`/admin/assign-training?userId=${user.id}`),
    }] : []),
    {
      label: 'Reset Password',
      icon: <KeyRound size={16} />,
      onClick: () => handleResetPassword(user),
    },
    {
      label: 'Deactivate User',
      icon: <UserX size={16} />,
      onClick: () => handleDeactivate(user),
      variant: 'danger',
      disabled: user.status === 'deactivated',
    },
  ];

  return (
    <div className="py-4 lg:px-8">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-heading-page text-navy">User Management</h1>
        </div>
        <button
          onClick={() => navigate('/admin/users/create')}
          className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-body font-medium text-white hover:bg-secondary/90 transition-colors"
        >
          <Plus size={18} />
          Create User
        </button>
      </div>
      <div className="border-b border-muted-200 mb-6" />

      {/* Search and Filter */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-muted-200 bg-white py-2.5 pl-10 pr-4 text-body text-muted-800 placeholder:text-muted-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-xl border border-muted-200 bg-white py-2.5 pl-9 pr-8 text-helper text-muted-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="mt-12">
          <LoadingIndicator label="Loading users..." />
        </div>
      )}

      {error && (
        <div className="mt-6">
          <ErrorMessage message={error.message} onRetry={() => refetch()} />
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* Table */}
          <div className="mt-6 overflow-hidden rounded-xl border border-muted-200 bg-white shadow-sm">
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-muted-200 bg-muted-50">
                    <th className="px-4 py-3 text-left text-helper font-medium text-muted-600">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-helper font-medium text-muted-600">
                      Role/Job Title
                    </th>
                    <th className="px-4 py-3 text-left text-helper font-medium text-muted-600">
                      Assigned Segment
                    </th>
                    <th className="px-4 py-3 text-left text-helper font-medium text-muted-600">
                      Progress
                    </th>
                    <th className="px-4 py-3 text-left text-helper font-medium text-muted-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-helper font-medium text-muted-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted-200">
                  {filteredUsers.map((user) => (
                    <UserTableRow
                      key={user.id}
                      user={user}
                      onNavigate={() => navigate(`/admin/users/${user.slug}`)}
                      onActionClick={(e) => e.stopPropagation()}
                      actions={getRowActions(user)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-muted-200">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => navigate(`/admin/users/${user.slug}`)}
                  className="flex items-center justify-between p-4 hover:bg-muted-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {user.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt={user.name}
                        loading="lazy"
                        className="h-10 w-10 rounded-full object-cover border border-muted-200"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-primary font-medium text-helper">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-body font-medium text-navy">{user.name}</p>
                      <p className="text-helper text-muted-500">{user.email}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-helper text-muted-500 capitalize font-medium">{user.role}</span>
                        {user.jobTitle && (
                          <span className="text-helper text-muted-500">•</span>
                        )}
                        {user.jobTitle && (
                          <span className="text-helper text-muted-500">{user.jobTitle}</span>
                        )}
                        <StatusBadge status={user.status} />
                      </div>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <ActionMenu items={getRowActions(user)} />
                  </div>
                </div>
              ))}
            </div>

            {filteredUsers.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-body text-muted-500">No users found.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-helper text-muted-500">
                Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} users)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-muted-200 px-3 py-1.5 text-helper text-muted-700 hover:bg-muted-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.pagination.totalPages}
                  className="rounded-lg border border-muted-200 px-3 py-1.5 text-helper text-muted-700 hover:bg-muted-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Deactivate Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeactivateConfirm}
        onOpenChange={setShowDeactivateConfirm}
        title="Deactivate User"
        description={`Are you sure you want to deactivate ${deactivateTarget?.name}? They will no longer be able to access the platform.`}
        confirmLabel="Deactivate"
        onConfirm={confirmDeactivate}
        isLoading={deactivateMutation.isPending}
        variant="danger"
      />

      {/* Reset Password Success Modal */}
      <SuccessModal
        open={showResetSuccess}
        onOpenChange={(open) => {
          setShowResetSuccess(open);
          if (!open) {
            setTempPassword(null);
            setResetTarget(null);
          }
        }}
        title="Password Reset Successfully"
        description={
          tempPassword
            ? `New temporary password for ${resetTarget?.name}: ${tempPassword}`
            : undefined
        }
        actionLabel="Done"
      />
    </div>
  );
}
