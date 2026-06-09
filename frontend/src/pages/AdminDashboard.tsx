import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useDashboardStats, useSegments } from '@/hooks/useAdminApi';
import { useRecentActivity } from '@/hooks/useQuiz';
import {
  Users,
  BookOpen,
  Layers,
  GraduationCap,
  ArrowRight,
  Filter,
  Loader2,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Segment } from '@/types/admin';
import type { ActivityItem } from '@/types/quiz';

// --- Helpers ---

type SegmentHealthStatus = 'ending_soon' | 'expired' | 'on_track';

function getSegmentHealthStatus(segment: Segment): SegmentHealthStatus {
  if (!segment.earliestExpiryDate) return 'on_track';
  const expiryDate = new Date(segment.earliestExpiryDate);
  const now = new Date();
  if (expiryDate < now) return 'expired';
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (expiryDate <= sevenDaysFromNow) return 'ending_soon';
  return 'on_track';
}

function getProgressPercentage(segment: Segment): number {
  // Derive a progress indicator from available data
  // For now, use a heuristic based on segment age and duration
  if (!segment.duration) return 0;
  const createdDate = new Date(segment.createdAt);
  const now = new Date();
  const elapsedDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  const progress = Math.min(100, Math.round((elapsedDays / segment.duration) * 100));
  return Math.max(0, progress);
}

// --- Stats Card Component ---

interface StatsCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  subText?: string;
  subTextColor?: string;
}

function StatsCard({ label, value, icon, iconBg, subText, subTextColor }: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-muted-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', iconBg)}>
          {icon}
        </div>
        <p className="text-helper text-muted-500">{label}</p>
      </div>
      <p className="text-heading-section text-navy mt-3">{value}</p>
      {subText && (
        <p className={cn('text-xs mt-1 font-medium', subTextColor || 'text-warning-500')}>
          {subText}
        </p>
      )}
    </div>
  );
}

// --- Health Status Badge Component ---

function HealthStatusBadge({ status }: { status: SegmentHealthStatus }) {
  const config: Record<SegmentHealthStatus, { label: string; className: string }> = {
    ending_soon: {
      label: 'Ending Soon',
      className: 'bg-warning-50 text-warning-600',
    },
    expired: {
      label: 'Expired',
      className: 'bg-danger-50 text-danger-500',
    },
    on_track: {
      label: 'On Track',
      className: 'bg-success-50 text-success-600',
    },
  };

  const { label, className } = config[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        className
      )}
    >
      {label}
    </span>
  );
}

// --- Progress Bar Component ---

function ProgressBar({ percentage, status }: { percentage: number; status: SegmentHealthStatus }) {
  const barColor: Record<SegmentHealthStatus, string> = {
    ending_soon: 'bg-warning-500',
    expired: 'bg-danger-400',
    on_track: 'bg-success-400',
  };

  return (
    <div className="h-1.5 w-full rounded-full bg-muted-100">
      <div
        className={cn('h-1.5 rounded-full transition-all', barColor[status])}
        style={{ width: `${percentage}%` }}
      />
    </div>
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
  });

  const healthStatus = getSegmentHealthStatus(segment);
  const progress = getProgressPercentage(segment);
  const assignedCount = segment.assignedUserCount ?? 0;

  return (
    <div className="border-b border-muted-100 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="truncate text-body font-semibold text-navy">{segment.title}</p>
        <HealthStatusBadge status={healthStatus} />
      </div>
      <div className="flex items-center gap-4 mb-2">
        <span className="inline-flex items-center gap-1 text-xs text-muted-500">
          <Calendar size={12} className="text-muted-400" />
          {createdDate}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-500">
          <Users size={12} className="text-muted-400" />
          {assignedCount}
        </span>
      </div>
      <ProgressBar percentage={progress} status={healthStatus} />
    </div>
  );
}

// --- Relative Time Formatter ---

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) return 'Just now'; // future dates (clock skew)
  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}hr ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// --- User Avatar Component ---

function UserAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const initial = name.charAt(0).toUpperCase();

  if (avatarUrl) {
    return (
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted-100">
        <img
          src={avatarUrl}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <span
          className="absolute inset-0 items-center justify-center text-xs font-semibold text-primary"
          style={{ display: 'none' }}
        >
          {initial}
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50">
      <span className="text-xs font-semibold text-primary">{initial}</span>
    </div>
  );
}

// --- Recent Activity Item ---

function RecentActivityItem({ activity }: { activity: ActivityItem }) {
  return (
    <div className="flex items-start gap-3 border-b border-muted-100 py-3 last:border-b-0">
      <UserAvatar name={activity.userName} avatarUrl={activity.userAvatar} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-helper font-medium text-navy">{activity.userName}</p>
          <span className="shrink-0 text-xs text-muted-400">
            {formatRelativeTime(activity.createdAt)}
          </span>
        </div>
        <p className="text-helper text-muted-600">{activity.description}</p>
        {activity.detail && (
          <p className="text-xs text-muted-400">{activity.detail}</p>
        )}
        {activity.score && (
          <p className="text-xs font-medium text-primary">Score: {activity.score}</p>
        )}
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

  // Recent activity from backend
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const {
    data: recentActivity,
    isLoading: activityLoading,
    error: activityError,
  } = useRecentActivity(20, activityFilter);

  // Compute ending soon count for the stats card
  const endingSoonCount = stats?.endingSoonCount ?? 0;

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
            subText={endingSoonCount > 0 ? `${endingSoonCount} Ending Soon` : undefined}
            subTextColor="text-warning-500"
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
                  <option value="all">All</option>
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

            {/* View All Segment link */}
            <div className="mt-4 border-t border-muted-100 pt-3">
              <Link
                to="/admin/content"
                className="inline-flex items-center gap-1 text-helper font-medium text-primary hover:text-primary/80"
              >
                View All Segment
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-muted-200 bg-white p-5 shadow-sm h-fit">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-heading-card text-navy">Recent Activity</h2>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-muted-400" />
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  className="rounded-lg border border-muted-200 bg-white px-3 py-1.5 text-helper text-muted-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  aria-label="Filter activity"
                >
                  <option value="all">All</option>
                  <option value="quiz_passed">Quiz Passed</option>
                  <option value="quiz_failed">Quiz Failed</option>
                  <option value="lesson_completed">Lesson Completed</option>
                  <option value="lesson_resumed">Lesson Resumed</option>
                  <option value="module_completed">Module Completed</option>
                  <option value="segment_assigned">Segment Assigned</option>
                  <option value="user_created">User Created</option>
                </select>
              </div>
            </div>

            {activityLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-teal" />
              </div>
            ) : activityError ? (
              <div className="flex items-center gap-2 rounded-lg border border-danger-200 bg-danger-50 p-3 text-helper text-danger-600">
                <AlertCircle size={14} />
                <span>Failed to load activity.</span>
              </div>
            ) : !recentActivity || recentActivity.length === 0 ? (
              <p className="py-6 text-center text-helper text-muted-400">
                No recent activity.
              </p>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                {recentActivity.map((activity) => (
                  <RecentActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
