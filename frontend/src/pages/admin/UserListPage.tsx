import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, User, UserCog, KeyRound, UserX } from 'lucide-react';
import { useUsers, useDeactivateUser, useResetUserPassword } from '@/hooks/useAdminApi';
import { StatusBadge, ActionMenu, LoadingIndicator, ErrorMessage, ConfirmationDialog, SuccessModal } from '@/components/shared';
import type { ActionMenuItem } from '@/components/shared';
import type { UserProfile } from '@/types/admin';

const STATUS_FILTERS = ['All', 'Active', 'Deactivated'] as const;

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
      icon: <User size={16} />,
      onClick: () => navigate(`/admin/users/${user.id}`),
    },
    {
      label: 'Assign Segment',
      icon: <UserCog size={16} />,
      onClick: () => navigate(`/admin/assign-training?userId=${user.id}`),
    },
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
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-heading-page text-navy">User Management</h1>
          <p className="mt-1 text-body text-muted-500">
            Manage user accounts, roles, and segment assignments.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/users/create')}
          className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-body font-medium text-white hover:bg-navy-600 transition-colors"
        >
          <Plus size={18} />
          Create User
        </button>
      </div>

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
            className="w-full rounded-xl border border-muted-200 bg-white py-2.5 pl-10 pr-4 text-body text-muted-800 placeholder:text-muted-400 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal transition-colors"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-xl border border-muted-200 bg-white py-2.5 pl-9 pr-8 text-helper text-muted-700 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal transition-colors"
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
                      Role / Job Title
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
                    <tr key={user.id} className="hover:bg-muted-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-teal-700 font-medium text-helper">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-body font-medium text-navy">{user.name}</p>
                            <p className="text-helper text-muted-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-helper text-muted-700 capitalize">{user.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-helper text-muted-500">—</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-muted-200">
                            <div className="h-full w-0 rounded-full bg-teal" />
                          </div>
                          <span className="text-helper text-muted-500">—</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ActionMenu items={getRowActions(user)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-muted-200">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-teal-700 font-medium text-helper">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-body font-medium text-navy">{user.name}</p>
                      <p className="text-helper text-muted-500">{user.email}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-helper text-muted-500 capitalize">{user.role}</span>
                        <StatusBadge status={user.status} />
                      </div>
                    </div>
                  </div>
                  <ActionMenu items={getRowActions(user)} />
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
