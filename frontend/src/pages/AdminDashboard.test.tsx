import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminDashboard } from './AdminDashboard';

// Mock the hooks
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Admin User', email: 'admin@test.com', role: 'admin' },
  }),
}));

const mockDashboardStats = {
  totalUsers: 42,
  totalSegments: 5,
  totalModules: 12,
  totalLessons: 48,
};

const mockSegments = [
  {
    id: '1',
    title: 'Dental Hygiene Basics',
    description: 'Introduction to dental hygiene',
    status: 'active' as const,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    title: 'Advanced Procedures',
    description: 'Advanced dental procedures',
    status: 'draft' as const,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
];

vi.mock('@/hooks/useAdminApi', () => ({
  useDashboardStats: vi.fn(),
  useSegments: vi.fn(),
}));

import { useDashboardStats, useSegments } from '@/hooks/useAdminApi';

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dashboard header with user greeting', () => {
    vi.mocked(useDashboardStats).mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useDashboardStats>);
    vi.mocked(useSegments).mockReturnValue({
      data: mockSegments,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSegments>);

    renderDashboard();

    expect(screen.getByText(/Hi, Admin User/)).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders stats cards with correct values', () => {
    vi.mocked(useDashboardStats).mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useDashboardStats>);
    vi.mocked(useSegments).mockReturnValue({
      data: mockSegments,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSegments>);

    renderDashboard();

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Active Segments')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Total Modules')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Total Lessons')).toBeInTheDocument();
    expect(screen.getByText('48')).toBeInTheDocument();
  });

  it('renders quick action buttons with navigation links', () => {
    vi.mocked(useDashboardStats).mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useDashboardStats>);
    vi.mocked(useSegments).mockReturnValue({
      data: mockSegments,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSegments>);

    renderDashboard();

    expect(screen.getByText('Assign Segment')).toBeInTheDocument();
    expect(screen.getByText('Create User')).toBeInTheDocument();
    expect(screen.getByText('Add New Segment')).toBeInTheDocument();
  });

  it('renders segment overview list with segments', () => {
    vi.mocked(useDashboardStats).mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useDashboardStats>);
    vi.mocked(useSegments).mockReturnValue({
      data: mockSegments,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSegments>);

    renderDashboard();

    expect(screen.getByText('Segment Overview')).toBeInTheDocument();
    expect(screen.getByText('Dental Hygiene Basics')).toBeInTheDocument();
    expect(screen.getByText('Advanced Procedures')).toBeInTheDocument();
    // "Active" appears in both the filter dropdown and the status badge
    expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Draft').length).toBeGreaterThanOrEqual(1);
  });

  it('renders recent activity panel', () => {
    vi.mocked(useDashboardStats).mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useDashboardStats>);
    vi.mocked(useSegments).mockReturnValue({
      data: mockSegments,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSegments>);

    renderDashboard();

    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('New segment created')).toBeInTheDocument();
    expect(screen.getByText('User assigned to training')).toBeInTheDocument();
  });

  it('renders navigation links to content and user management', () => {
    vi.mocked(useDashboardStats).mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useDashboardStats>);
    vi.mocked(useSegments).mockReturnValue({
      data: mockSegments,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSegments>);

    renderDashboard();

    expect(screen.getByText('View all segments')).toBeInTheDocument();
    expect(screen.getByText('View user management')).toBeInTheDocument();
  });

  it('shows loading state when stats are loading', () => {
    vi.mocked(useDashboardStats).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useDashboardStats>);
    vi.mocked(useSegments).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useSegments>);

    renderDashboard();

    // Should not show stats values when loading
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });

  it('shows error state when stats fail to load', () => {
    vi.mocked(useDashboardStats).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Network error' },
    } as ReturnType<typeof useDashboardStats>);
    vi.mocked(useSegments).mockReturnValue({
      data: mockSegments,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSegments>);

    renderDashboard();

    expect(screen.getByText(/Failed to load dashboard statistics/)).toBeInTheDocument();
  });

  it('renders status filter dropdown', () => {
    vi.mocked(useDashboardStats).mockReturnValue({
      data: mockDashboardStats,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useDashboardStats>);
    vi.mocked(useSegments).mockReturnValue({
      data: mockSegments,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSegments>);

    renderDashboard();

    const filterSelect = screen.getByLabelText('Filter segments by status');
    expect(filterSelect).toBeInTheDocument();
  });
});
