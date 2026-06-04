import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useDashboardStats, useSegments } from '@/hooks/useAdminApi';
import {
  Users,
  BookOpen,
  Layers,
  GraduationCap,
  ArrowRight,
  Filter,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Segment, SegmentStatus } from '@/types/admin';

// --- Stats Card Component ---

interface StatsCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
}

function StatsCard({ label, value, icon, iconBg }: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-muted-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', iconBg)}>
          {icon}
        </div>
        <p className="text-helper text-muted-500">{label}</p>
      </div>
      <p className="text-heading-section text-navy mt-3">{value}</p>
    </div>
  );
}

// --- Status Badge Component ---

function StatusBadge({ status }: { status: SegmentStatus }) {
  const config: Record<SegmentStatus, { label: string; className: string }> = {
    active: {
      label: 'Active',
      className: 'bg-success-50 text-success-600 border-success-200',
    },
    draft: {
      label: 'Draft',
      className: 'bg-muted-100 text-muted-600 border-muted-300',
    },
    archived: {
      label: 'Archived',
      className: 'bg-warning-50 text-warning-600 border-warning-200',
    },
  };

  const { label, className } = config[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        className
      )}
    >
      {label}
    </span>
  );
}

// --- Segment Overview Row ---

interface SegmentRowProps {
  segment: Segment;
}

function SegmentRow({ segment }: SegmentRowProps) {
  const createdDate = new Date(segment.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex items-center justify-between gap-4 border-b border-muted-100 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-medium text-navy">{segment.title}</p>
        <p className="text-helper text-muted-400">{createdDate}</p>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={segment.status} />
      </div>
    </div>
  );
}

// --- Recent Activity Item ---

interface ActivityItem {
  id: string;
  description: string;
  timestamp: string;
}

function RecentActivityItem({ activity }: { activity: ActivityItem }) {
  return (
    <div className="flex items-start gap-3 border-b border-muted-100 py-3 last:border-b-0">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50">
        <Clock size={14} className="text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-helper text-muted-700">{activity.description}</p>
        <p className="text-xs text-muted-400">{activity.timestamp}</p>
      </div>
    </div>
  );
}

// --- Main Dashboard Page ---

export function AdminDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();

  // Add pagination state for segments
  const [segmentPage, setSegmentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');

  const { data: segmentsData, isLoading: segmentsLoading, error: segmentsError } = useSegments({
    page: segmentPage,
    limit: 5,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  // Exclude archived from the dashboard segment list
  const segments = (segmentsData?.data ?? []).filter((s) => s.status !== 'archived');

  // Lightweight recent activity (placeholder operational events)
  const recentActivity: ActivityItem[] = [
    { id: '1', description: 'New segment created', timestamp: 'Just now' },
    { id: '2', description: 'User assigned to training', timestamp: '5 min ago' },
    { id: '3', description: 'Module content updated', timestamp: '1 hour ago' },
    { id: '4', description: 'New user account created', timestamp: '2 hours ago' },
  ];

  return (
    <div className="pb-4 pt-1 lg:px-8">
      {/* Header */}
      <div className="mb-2">
        <p className="text-body text-muted-500">
          Hi{user?.name ? `, ${user.name}` : ' there'} 👋
        </p>
        <h1 className="text-heading-page text-navy">Dashboard</h1>
      </div>

      {/* Divider */}
      <div className="border-b border-muted-200 mb-6" />

      {/* Quick Actions */}
      <h2 className="text-helper font-medium text-muted-500 mb-3">Quick Actions</h2>
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          to="/admin/assign-training"
          className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-helper font-medium text-white shadow-sm transition-colors hover:bg-secondary/90"
        >
          <img src="/icon/assignment_add.png" alt="" className="h-4 w-4 invert brightness-0" />
          Assign Segment
        </Link>
        <Link
          to="/admin/users/create"
          className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-helper font-medium text-white shadow-sm transition-colors hover:bg-secondary/90"
        >
          <img src="/icon/group_add.png" alt="" className="h-4 w-4 invert brightness-0" />
          Create User
        </Link>
        <Link
          to="/admin/content/segments/create"
          className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-helper font-medium text-white shadow-sm transition-colors hover:bg-secondary/90"
        >
          <img src="/icon/add.png" alt="" className="h-4 w-4 invert brightness-0" />
          Add New Segment
        </Link>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="mb-6 flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-teal" />
        </div>
      ) : statsError ? (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-danger-200 bg-danger-50 p-4 text-helper text-danger-600">
          <AlertCircle size={16} />
          <span>Failed to load dashboard statistics. Please try again.</span>
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label="Total Users"
            value={stats?.totalUsers ?? 0}
            icon={<Users size={16} className="text-white" />}
            iconBg="bg-primary"
          />
          <StatsCard
            label="Active Segments"
            value={stats?.totalSegments ?? 0}
            icon={<Layers size={16} className="text-white" />}
            iconBg="bg-primary"
          />
          <StatsCard
            label="Total Modules"
            value={stats?.totalModules ?? 0}
            icon={<BookOpen size={16} className="text-white" />}
            iconBg="bg-primary"
          />
          <StatsCard
            label="Total Lessons"
            value={stats?.totalLessons ?? 0}
            icon={<GraduationCap size={16} className="text-white" />}
            iconBg="bg-primary"
          />
        </div>
      )}

      {/* Main Content Grid: Segment Overview + Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Segment Overview */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-muted-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-heading-card text-navy">Segment Overview</h2>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-muted-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'draft')}
                  className="rounded-lg border border-muted-200 bg-white px-3 py-1.5 text-helper text-muted-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  aria-label="Filter segments by status"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            {segmentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-teal" />
              </div>
            ) : segmentsError ? (
              <div className="flex items-center gap-2 rounded-lg border border-danger-200 bg-danger-50 p-3 text-helper text-danger-600">
                <AlertCircle size={14} />
                <span>Failed to load segments.</span>
              </div>
            ) : segments.length === 0 ? (
              <p className="py-6 text-center text-helper text-muted-400">
                No segments found.
              </p>
            ) : (
              <>
                <div>
                  {segments.map((segment) => (
                    <SegmentRow key={segment.id} segment={segment} />
                  ))}
                </div>

                {/* Pagination Controls */}
                {segmentsData?.pagination && segmentsData.pagination.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between border-t border-muted-100 pt-3">
                    <p className="text-helper text-muted-500">
                      Page {segmentsData.pagination.page} of {segmentsData.pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSegmentPage(p => Math.max(1, p - 1))}
                        disabled={segmentPage <= 1}
                        className="px-3 py-1.5 rounded-lg border border-muted-200 hover:bg-muted-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-helper font-medium text-muted-600"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setSegmentPage(p => p + 1)}
                        disabled={segmentPage >= segmentsData.pagination.totalPages}
                        className="px-3 py-1.5 rounded-lg border border-muted-200 hover:bg-muted-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-helper font-medium text-muted-600"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Navigation link to content management */}
            <div className="mt-4 border-t border-muted-100 pt-3">
              <Link
                to="/admin/content"
                className="inline-flex items-center gap-1 text-helper font-medium text-primary hover:text-primary/80"
              >
                View all segments
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-muted-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-heading-card text-navy">Recent Activity</h2>
            <div className="max-h-80 overflow-y-auto">
              {recentActivity.map((activity) => (
                <RecentActivityItem key={activity.id} activity={activity} />
              ))}
            </div>

            {/* Navigation link to user management */}
            <div className="mt-4 border-t border-muted-100 pt-3">
              <Link
                to="/admin/users"
                className="inline-flex items-center gap-1 text-helper font-medium text-primary hover:text-primary/80"
              >
                View user management
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
