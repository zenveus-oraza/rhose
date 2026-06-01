import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, BookOpen, Trash2 } from 'lucide-react';
import { useSegments, useDeleteSegment } from '@/hooks/useAdminApi';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/ActionMenu';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import type { Segment, SegmentStatus } from '@/types/admin';

export function SegmentListPage() {
  const navigate = useNavigate();
  const { data: segments, isLoading, error, refetch } = useSegments();
  const deleteSegment = useDeleteSegment();

  const [deleteTarget, setDeleteTarget] = useState<Segment | null>(null);
  const [statusFilter, setStatusFilter] = useState<SegmentStatus | 'all'>('all');

  const filteredSegments = segments?.filter((s) =>
    statusFilter === 'all' ? true : s.status === statusFilter
  );

  function getRowActions(segment: Segment): ActionMenuItem[] {
    return [
      {
        label: 'Edit',
        icon: <Edit size={16} />,
        onClick: () => navigate(`/admin/content/segments/${segment.id}/edit`),
      },
      {
        label: 'Manage Modules',
        icon: <BookOpen size={16} />,
        onClick: () => navigate(`/admin/content/segments/${segment.id}`),
      },
      {
        label: 'Delete',
        icon: <Trash2 size={16} />,
        onClick: () => setDeleteTarget(segment),
        variant: 'danger',
      },
    ];
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteSegment.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingIndicator label="Loading segments..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorMessage
          message={error.message || 'Failed to load segments'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-heading-section text-navy">Content Management</h1>
          <p className="text-body text-muted-600 mt-1">
            Manage your learning segments, modules, and lessons
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/content/segments/create')}
          className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-helper font-medium text-white hover:bg-navy-600 transition"
        >
          <Plus size={18} />
          <span>Create Segment</span>
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="status-filter" className="text-helper font-medium text-muted-600">
          Status:
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SegmentStatus | 'all')}
          className="rounded-lg border border-muted-300 px-3 py-1.5 text-helper text-navy focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      {filteredSegments && filteredSegments.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-muted-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-muted-200 bg-muted-50">
                  <th className="px-6 py-3 text-left text-helper font-medium text-muted-600">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-helper font-medium text-muted-600">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-helper font-medium text-muted-600 hidden sm:table-cell">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-helper font-medium text-muted-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted-100">
                {filteredSegments.map((segment) => (
                  <tr
                    key={segment.id}
                    className="hover:bg-muted-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/admin/content/segments/${segment.id}`)}
                        className="text-left"
                      >
                        <p className="text-body font-medium text-navy hover:text-teal-600 transition">
                          {segment.title}
                        </p>
                        {segment.description && (
                          <p className="text-helper text-muted-500 mt-0.5 line-clamp-1">
                            {segment.description}
                          </p>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge variant={segment.status} />
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className="text-helper text-muted-500">
                        {new Date(segment.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ActionMenu items={getRowActions(segment)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-muted-200 bg-white p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-300" />
          <h3 className="mt-4 text-heading-card text-navy">No segments yet</h3>
          <p className="mt-2 text-body text-muted-500">
            Create your first learning segment to get started.
          </p>
          <button
            onClick={() => navigate('/admin/content/segments/create')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-helper font-medium text-white hover:bg-navy-600 transition"
          >
            <Plus size={18} />
            <span>Create Segment</span>
          </button>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Segment"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone. The segment must have no modules before it can be deleted.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteSegment.isPending}
      />
    </div>
  );
}
