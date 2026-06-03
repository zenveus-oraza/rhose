import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, UserX, UserCog, Mail } from 'lucide-react';
import {
  useUsers,
  useUserAssignments,
  useDeactivateUser,
  useResetUserPassword,
  useDeleteAssignment,
} from '@/hooks/useAdminApi';
import {
  StatusBadge,
  LoadingIndicator,
  ErrorMessage,
  ConfirmationDialog,
  SuccessModal,
} from '@/components/shared';
import type { UserProfile } from '@/types/admin';

export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  // Fetch user from the list (since there's no single-user endpoint in the hooks)
  const { data: usersData, isLoading: usersLoading } = useUsers({ limit: 100 });
  const { data: assignments, isLoading: assignmentsLoading } = useUserAssignments(userId ?? '');
  const deactivateMutation = useDeactivateUser();
  const resetPasswordMutation = useResetUserPassword();
  const deleteAssignmentMutation = useDeleteAssignment();

  // UI state
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [removeAssignmentId, setRemoveAssignmentId] = useState<string | null>(null);

  const user: UserProfile | undefined = usersData?.data.find((u) => u.id === userId);

  const handleResetPassword = () => {
    if (!userId) return;
    resetPasswordMutation.mutate(userId, {
      onSuccess: (response) => {
        setTempPassword(response.temporaryPassword);
        setShowResetSuccess(true);
      },
    });
  };

  const handleDeactivate = () => {
    if (!userId) return;
    deactivateMutation.mutate(userId, {
      onSuccess: () => {
        setShowDeactivateConfirm(false);
      },
    });
  };

  const handleRemoveAssignment = (assignmentId: string, segmentId: string) => {
    if (!userId) return;
    deleteAssignmentMutation.mutate(
      { id: assignmentId, segmentId, userId },
      {
        onSuccess: () => setRemoveAssignmentId(null),
      }
    );
  };

  if (usersLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingIndicator label="Loading user profile..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-4 lg:px-8">
        <ErrorMessage message="User not found." />
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
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-primary text-heading-card font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-heading-card text-navy">{user.name}</h2>
                  <StatusBadge status={user.status} />
                </div>
                <p className="mt-1 text-body text-muted-500">{user.email}</p>
                <p className="text-helper text-muted-400 capitalize">{user.role}</p>
              </div>
            </div>

            {/* User Info Grid */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-helper font-medium text-muted-500">Full Name</p>
                <p className="mt-0.5 text-body text-navy">{user.name}</p>
              </div>
              <div>
                <p className="text-helper font-medium text-muted-500">Email</p>
                <p className="mt-0.5 text-body text-navy">{user.email}</p>
              </div>
              <div>
                <p className="text-helper font-medium text-muted-500">Role</p>
                <p className="mt-0.5 text-body text-navy capitalize">{user.role}</p>
              </div>
              <div>
                <p className="text-helper font-medium text-muted-500">Status</p>
                <StatusBadge status={user.status} />
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
          </div>

          {/* Segment Assignments */}
          <div className="rounded-xl border border-muted-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-heading-card text-navy">Segment Assignments</h2>
              <button
                onClick={() => navigate(`/admin/assign-training?userId=${userId}`)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-muted-200 px-3 py-1.5 text-helper font-medium text-navy hover:bg-muted-50 transition-colors"
              >
                <UserCog size={14} />
                Assign New Segment
              </button>
            </div>

            {assignmentsLoading ? (
              <div className="mt-4">
                <LoadingIndicator size="sm" />
              </div>
            ) : assignments && assignments.length > 0 ? (
              <div className="mt-4 space-y-2">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between rounded-lg border border-muted-200 p-3"
                  >
                    <div>
                      <p className="text-body font-medium text-navy">{assignment.title}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <StatusBadge status={assignment.status} />
                        <span className="text-helper text-muted-400">
                          Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setRemoveAssignmentId(assignment.id)}
                      className="text-helper text-danger-500 hover:text-danger-700 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-center text-helper text-muted-500 py-4">
                No segments assigned yet.
              </p>
            )}
          </div>

          {/* Activity Log (lightweight) */}
          <div className="rounded-xl border border-muted-200 bg-white p-6">
            <h2 className="text-heading-card text-navy">Activity</h2>
            <p className="mt-4 text-center text-helper text-muted-500 py-4">
              No recent activity to display.
            </p>
          </div>
        </div>

        {/* Sidebar - Quick Actions & Account Details */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-xl border border-muted-200 bg-white p-6">
            <h3 className="text-heading-card text-navy">Quick Actions</h3>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => navigate(`/admin/assign-training?userId=${userId}`)}
                className="flex w-full items-center gap-2.5 rounded-lg border border-muted-200 px-4 py-2.5 text-helper font-medium text-navy hover:bg-muted-50 transition-colors"
              >
                <UserCog size={16} className="text-teal" />
                Assign Segment
              </button>
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
              <div>
                <p className="text-helper text-muted-500">Assigned Segments</p>
                <p className="mt-0.5 text-body text-navy">
                  {assignments?.length ?? 0}
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

      {/* Remove Assignment Confirmation */}
      {removeAssignmentId && (
        <ConfirmationDialog
          open={!!removeAssignmentId}
          onOpenChange={(open) => {
            if (!open) setRemoveAssignmentId(null);
          }}
          title="Remove Assignment"
          description="Are you sure you want to remove this segment assignment? The user will lose access to the segment content."
          confirmLabel="Remove"
          onConfirm={() => {
            const assignment = assignments?.find((a) => a.id === removeAssignmentId);
            if (assignment && userId) {
              handleRemoveAssignment(removeAssignmentId, assignment.segmentId);
            }
          }}
          isLoading={deleteAssignmentMutation.isPending}
          variant="warning"
        />
      )}
    </div>
  );
}
