import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, PlayCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAssignedSegments } from '@/hooks/useLearner';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import type { LearnerSegment } from '@/types/learner';

// --- Debounce Hook ---

function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// --- Sub-components ---

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="w-full bg-muted-200 rounded-full h-2.5" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="h-2.5 rounded-full bg-teal transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
      />
    </div>
  );
}

function AccessBadge({ status }: { status: 'active' | 'expired' }) {
  const styles = {
    active: 'bg-success-50 text-success-700 border-success-200',
    expired: 'bg-warning-50 text-warning-700 border-warning-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function SegmentCard({ segment }: { segment: LearnerSegment }) {
  const isExpired = segment.access_status === 'expired';

  return (
    <div className="bg-white rounded-xl border border-muted-200 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-heading-card text-navy line-clamp-2">{segment.title}</h3>
        <AccessBadge status={segment.access_status} />
      </div>

      {segment.description && (
        <p className="text-helper text-muted-500 line-clamp-2">{segment.description}</p>
      )}

      {/* Progress section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-helper text-muted-600 font-medium">
            {segment.progress_percentage}% complete
          </span>
          <span className="text-helper text-muted-500">
            {segment.completed_lessons}/{segment.total_lessons} lessons
          </span>
        </div>
        <ProgressBar percentage={segment.progress_percentage} />
      </div>

      {/* Detail cards row */}
      <div className="grid grid-cols-3 gap-2 mt-1">
        <div className="flex flex-col items-center gap-1 rounded-lg bg-muted-50 px-2 py-2.5">
          <BookOpen className="h-4 w-4 text-teal" aria-hidden="true" />
          <span className="text-xs text-muted-600 text-center">
            {segment.total_lessons} lessons
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-lg bg-muted-50 px-2 py-2.5">
          <Clock className="h-4 w-4 text-teal" aria-hidden="true" />
          <span className="text-xs text-muted-600 text-center">
            {segment.access_status === 'active' ? 'Active' : 'Expired'}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-lg bg-muted-50 px-2 py-2.5">
          <PlayCircle className="h-4 w-4 text-teal" aria-hidden="true" />
          <span className="text-xs text-muted-600 text-center">
            {segment.completed_lessons} done
          </span>
        </div>
      </div>

      {/* Resume action */}
      <Link
        to={`/learner/segments/${segment.segmentId}`}
        className={`mt-auto inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-body font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          isExpired
            ? 'bg-muted-200 text-muted-500 cursor-not-allowed pointer-events-none'
            : 'bg-secondary text-white hover:bg-secondary/90 focus:ring-secondary'
        }`}
        aria-disabled={isExpired}
        tabIndex={isExpired ? -1 : undefined}
      >
        <PlayCircle className="h-4 w-4" aria-hidden="true" />
        {segment.progress_percentage > 0 ? 'Resume' : 'Start'}
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <BookOpen className="h-16 w-16 text-muted-300 mb-4" aria-hidden="true" />
      <h2 className="text-heading-section text-navy mb-2">No training assigned yet</h2>
      <p className="text-body text-muted-500 max-w-md">
        You don't have any training segments assigned. Once your administrator assigns training to you, it will appear here.
      </p>
    </div>
  );
}

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-400" aria-hidden="true" />
      <input
        type="search"
        placeholder="Search segments by title..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-muted-200 bg-white py-2.5 pl-10 pr-4 text-body text-navy placeholder:text-muted-400 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
        aria-label="Search segments"
      />
    </div>
  );
}

function PaginationControls({
  page,
  totalPages,
  total,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between mt-8">
      <p className="text-body text-muted-600">
        Page {page} of {totalPages} (Total {total} items)
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevious}
          disabled={page <= 1}
          className="inline-flex items-center gap-1.5 rounded-md border border-muted-200 bg-white px-3 py-2 text-sm font-medium text-navy transition hover:bg-muted-50 focus:outline-none focus:ring-2 focus:ring-teal/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1.5 rounded-md border border-muted-200 bg-white px-3 py-2 text-sm font-medium text-navy transition hover:bg-muted-50 focus:outline-none focus:ring-2 focus:ring-teal/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// --- Main Component ---

export function LearnerDashboard() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Reset to page 1 when search changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    setPage(1);
  }, []);

  const { data, isLoading, error, refetch } = useAssignedSegments({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
  });

  if (isLoading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <LoadingIndicator size="lg" label="Loading your training..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorMessage
          message={error.message || 'Failed to load your training assignments.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const segments = data?.segments ?? [];
  const pagination = data?.pagination;

  return (
    <div className="p-8">
      <div className="flex flex-col gap-6 mb-8">
        <h1 className="text-heading-page text-navy">Your Active Training</h1>
        <SearchBar value={searchInput} onChange={handleSearchChange} />
      </div>

      {segments.length === 0 ? (
        debouncedSearch ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="h-16 w-16 text-muted-300 mb-4" aria-hidden="true" />
            <h2 className="text-heading-section text-navy mb-2">No results found</h2>
            <p className="text-body text-muted-500 max-w-md">
              No segments match "{debouncedSearch}". Try a different search term.
            </p>
          </div>
        ) : (
          <EmptyState />
        )
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {segments.map((segment) => (
              <SegmentCard key={segment.segmentId} segment={segment} />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <PaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPrevious={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            />
          )}
        </>
      )}
    </div>
  );
}
