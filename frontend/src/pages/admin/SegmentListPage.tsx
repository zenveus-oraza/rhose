import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, BookOpen, Search, Archive, Edit, FileText } from 'lucide-react';
import { useSegments, useUpdateSegment } from '@/hooks/useAdminApi';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/ActionMenu';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import type { Segment } from '@/types/admin';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function SegmentListPage() {
  const navigate = useNavigate();

  // Pagination and filter state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');

  const { data, isLoading, error, refetch } = useSegments({
    page,
    limit: 20,
    search: search || undefined,
    status: showArchived ? 'archived' : (statusFilter !== 'all' ? statusFilter : undefined),
  });

  const updateSegment = useUpdateSegment();
  const [archiveTarget, setArchiveTarget] = useState<Segment | null>(null);

  // Filter out archived from the main list (when not in "show archived" mode)
  const segments = showArchived
    ? (data?.data ?? [])
    : (data?.data ?? []).filter((s) => s.status !== 'archived');

  function getRowActions(segment: Segment): ActionMenuItem[] {
    const actions: ActionMenuItem[] = [
      {
        label: 'Edit',
        icon: <Edit size={16} />,
        onClick: () => navigate(`/admin/content/segments/${segment.slug}/edit`),
      },
      {
        label: 'View',
        icon: <BookOpen size={16} />,
        onClick: () => navigate(`/admin/content/segments/${segment.slug}`),
      },
    ];

    // Show Archive Segment action for non-archived segments
    if (segment.status !== 'archived') {
      actions.push({
        label: 'Archive Segment',
        icon: <Archive size={16} />,
        onClick: () => setArchiveTarget(segment),
        variant: 'danger',
      });
    }

    return actions;
  }

  function formatDuration(days: number | null): string {
    if (!days) return '—';
    if (days >= 7) {
      const weeks = Math.round(days / 7);
      return `${weeks} Week${weeks !== 1 ? 's' : ''}`;
    }
    return `${days} Day${days !== 1 ? 's' : ''}`;
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function handleArchive() {
    if (!archiveTarget) return;
    updateSegment.mutate(
      { id: archiveTarget.id, data: { status: 'archived' } },
      {
        onSuccess: () => {
          setArchiveTarget(null);
        },
      }
    );
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
    <div className="py-4 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-heading-section text-navy">Content Management</h1>
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-400" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-48 pl-9 pr-4 py-2 rounded-lg border border-muted-200 text-helper text-muted-800 placeholder:text-muted-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
          {/* Create New Segment Button */}
          <button
            onClick={() => navigate('/admin/content/segments/create')}
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-helper font-medium text-white hover:bg-navy-800 transition"
          >
            <FileText size={18} />
            <span>Create New Segment</span>
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-b border-muted-200 mb-6" />

      {/* Controls: Status Filter + Show Archived */}
      <div className="mb-4 flex items-center gap-3">
        {!showArchived && (
          <>
            <label htmlFor="status-filter" className="text-helper font-medium text-muted-600">
              Status:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | 'active' | 'draft');
                setPage(1);
              }}
              className="rounded-lg border border-muted-300 px-3 py-1.5 text-helper text-navy focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
          </>
        )}
        <button
          onClick={() => {
            setShowArchived(!showArchived);
            setPage(1);
          }}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-helper font-medium transition-colors ${
            showArchived
              ? 'border-teal bg-teal/10 text-teal'
              : 'border-muted-300 text-muted-600 hover:bg-muted-50'
          }`}
        >
          <Archive size={14} />
          <span>{showArchived ? 'Showing Archived' : 'Show Archived'}</span>
        </button>
      </div>

      {/* Table */}
      {segments.length > 0 ? (
        <>
          <div className="rounded-xl border border-muted-200 bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-muted-200 bg-muted-50">
                  <th className="px-6 py-3 text-left text-helper font-medium text-muted-600">
                    Segment Name
                  </th>
                  <th className="px-6 py-3 text-left text-helper font-medium text-muted-600">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-helper font-medium text-muted-600 hidden md:table-cell">
                    Created on
                  </th>
                  <th className="px-6 py-3 text-right text-helper font-medium text-muted-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted-100">
                {segments.map((segment) => (
                  <tr
                    key={segment.id}
                    className="hover:bg-muted-50 transition-colors"
                  >
                    {/* Segment Name + Metadata */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/admin/content/segments/${segment.id}`)}
                        className="text-left"
                      >
                        <p className="text-body font-semibold text-navy">
                          {segment.title}
                        </p>
                      </button>
                      <div className="mt-1 flex items-center gap-4 text-helper text-muted-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={14} className="text-muted-400" />
                          {formatDuration(segment.duration)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BookOpen size={14} className="text-muted-400" />
                          {segment.moduleCount ?? 0} Module{(segment.moduleCount ?? 0) !== 1 ? 's' : ''}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users size={14} className="text-muted-400" />
                          {segment.assignedUserCount ?? 0} Users Assigned
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                          segment.status === 'active'
                            ? 'border-success-200 text-success-700 bg-success-50'
                            : segment.status === 'draft'
                            ? 'border-danger-200 text-danger-700 bg-danger-50'
                            : 'border-muted-200 text-muted-600 bg-muted-100'
                        }`}
                      >
                        {segment.status}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-helper text-muted-600">
                        {formatDate(segment.createdAt)}
                      </span>
                    </td>

                    {/* Action Menu */}
                    <td className="px-6 py-4 text-right">
                      <ActionMenu items={getRowActions(segment)} />
                    </td>
                  </tr>
                ))}
                </tbody>
                <tbody className="divide-y divide-muted-100">
                  {segments.map((segment) => (
                    <tr
                      key={segment.id}
                      className="hover:bg-muted-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={() => navigate(`/admin/content/segments/${segment.slug}`)}
                          className="text-left"
                        >
                          <p className="text-body font-medium text-navy hover:text-primary transition">
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
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-helper text-muted-600">
                          {segment.moduleCount ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-helper text-muted-600">
                          {segment.duration ? `${segment.duration} days` : '—'}
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

          {/* Pagination Controls */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-helper text-muted-500">
                Page {data.pagination.page} of {data.pagination.totalPages}
                ({data.pagination.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-lg border border-muted-200 hover:bg-muted-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-helper font-medium text-muted-700"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= data.pagination.totalPages}
                  className="px-4 py-2 rounded-lg border border-muted-200 hover:bg-muted-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-helper font-medium text-muted-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-muted-200 bg-white p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-300" />
          <h3 className="mt-4 text-heading-card text-navy">No segments yet</h3>
          <p className="mt-2 text-body text-muted-500">
            Create your first learning segment to get started.
          </p>
          <button
            onClick={() => navigate('/admin/content/segments/create')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-helper font-medium text-white hover:bg-navy-800 transition"
          >
            <FileText size={18} />
            <span>Create New Segment</span>
          </button>
        </div>
      )}

      {/* Archive Confirmation */}
      <ConfirmationDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="Archive Segment"
        description={`Are you sure you want to archive "${archiveTarget?.title}"? Archived segments cannot be reactivated.`}
        confirmLabel="Archive"
        variant="danger"
        isLoading={updateSegment.isPending}
      />
    </div>
  );
}
