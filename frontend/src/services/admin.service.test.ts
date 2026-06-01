import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as adminService from './admin.service';
import * as api from './api';

vi.mock('./api', () => ({
  apiClient: vi.fn(),
}));

const mockApiClient = vi.mocked(api.apiClient);

describe('admin.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('calls the correct endpoint', async () => {
      const stats = { totalSegments: 5, totalModules: 10, totalLessons: 20, totalUsers: 50 };
      mockApiClient.mockResolvedValue(stats);

      const result = await adminService.getDashboardStats();

      expect(mockApiClient).toHaveBeenCalledWith('/admin/dashboard/stats');
      expect(result).toEqual(stats);
    });
  });

  describe('segments', () => {
    it('createSegment sends POST with body', async () => {
      const input = { title: 'Test Segment', description: 'A description' };
      const segment = { id: '1', ...input, status: 'draft', createdAt: '', updatedAt: '' };
      mockApiClient.mockResolvedValue(segment);

      const result = await adminService.createSegment(input);

      expect(mockApiClient).toHaveBeenCalledWith('/admin/segments', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      expect(result).toEqual(segment);
    });

    it('listSegments calls GET /admin/segments', async () => {
      mockApiClient.mockResolvedValue([]);

      await adminService.listSegments();

      expect(mockApiClient).toHaveBeenCalledWith('/admin/segments');
    });

    it('getSegment calls GET /admin/segments/:id', async () => {
      const segment = { id: 'abc', title: 'Test', moduleCount: 3 };
      mockApiClient.mockResolvedValue(segment);

      const result = await adminService.getSegment('abc');

      expect(mockApiClient).toHaveBeenCalledWith('/admin/segments/abc');
      expect(result).toEqual(segment);
    });

    it('updateSegment sends PUT with body', async () => {
      const data = { title: 'Updated' };
      mockApiClient.mockResolvedValue({ id: '1', title: 'Updated' });

      await adminService.updateSegment('1', data);

      expect(mockApiClient).toHaveBeenCalledWith('/admin/segments/1', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    });

    it('deleteSegment sends DELETE', async () => {
      mockApiClient.mockResolvedValue({ message: 'Segment deleted successfully' });

      await adminService.deleteSegment('1');

      expect(mockApiClient).toHaveBeenCalledWith('/admin/segments/1', {
        method: 'DELETE',
      });
    });
  });

  describe('modules', () => {
    it('createModule sends POST to segment-scoped endpoint', async () => {
      const data = { title: 'Module 1' };
      mockApiClient.mockResolvedValue({ id: '1', ...data });

      await adminService.createModule('seg-1', data);

      expect(mockApiClient).toHaveBeenCalledWith('/admin/segments/seg-1/modules', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    });

    it('listModules calls GET on segment-scoped endpoint', async () => {
      mockApiClient.mockResolvedValue([]);

      await adminService.listModules('seg-1');

      expect(mockApiClient).toHaveBeenCalledWith('/admin/segments/seg-1/modules');
    });

    it('reorderModules sends PUT with orderedIds', async () => {
      const data = { orderedIds: ['a', 'b', 'c'] };
      mockApiClient.mockResolvedValue({ message: 'ok' });

      await adminService.reorderModules('seg-1', data);

      expect(mockApiClient).toHaveBeenCalledWith('/admin/segments/seg-1/modules/reorder', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    });

    it('deleteModule sends DELETE to /admin/modules/:id', async () => {
      mockApiClient.mockResolvedValue({ message: 'ok' });

      await adminService.deleteModule('mod-1');

      expect(mockApiClient).toHaveBeenCalledWith('/admin/modules/mod-1', {
        method: 'DELETE',
      });
    });
  });

  describe('lessons', () => {
    it('createLesson sends POST to module-scoped endpoint', async () => {
      const data = { title: 'Lesson 1', content_type: 'text' as const, content_body: 'Hello' };
      mockApiClient.mockResolvedValue({ id: '1', ...data });

      await adminService.createLesson('mod-1', data);

      expect(mockApiClient).toHaveBeenCalledWith('/admin/modules/mod-1/lessons', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    });

    it('getLesson calls GET /admin/lessons/:id', async () => {
      mockApiClient.mockResolvedValue({ id: 'les-1', title: 'Lesson' });

      await adminService.getLesson('les-1');

      expect(mockApiClient).toHaveBeenCalledWith('/admin/lessons/les-1');
    });

    it('reorderLessons sends PUT with orderedIds', async () => {
      const data = { orderedIds: ['x', 'y'] };
      mockApiClient.mockResolvedValue({ message: 'ok' });

      await adminService.reorderLessons('mod-1', data);

      expect(mockApiClient).toHaveBeenCalledWith('/admin/modules/mod-1/lessons/reorder', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    });
  });

  describe('user management', () => {
    it('createUser sends POST with user data', async () => {
      const data = { name: 'John', email: 'john@test.com', role: 'learner' as const };
      mockApiClient.mockResolvedValue({ id: '1', ...data, temporaryPassword: 'abc123' });

      await adminService.createUser(data);

      expect(mockApiClient).toHaveBeenCalledWith('/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    });

    it('listUsers builds query string from params', async () => {
      mockApiClient.mockResolvedValue({ data: [], pagination: {} });

      await adminService.listUsers({ page: 2, limit: 10, search: 'john' });

      expect(mockApiClient).toHaveBeenCalledWith('/admin/users?page=2&limit=10&search=john');
    });

    it('listUsers calls without query string when no params', async () => {
      mockApiClient.mockResolvedValue({ data: [], pagination: {} });

      await adminService.listUsers();

      expect(mockApiClient).toHaveBeenCalledWith('/admin/users');
    });

    it('deactivateUser sends PUT to deactivate endpoint', async () => {
      mockApiClient.mockResolvedValue({ id: '1', status: 'deactivated' });

      await adminService.deactivateUser('1');

      expect(mockApiClient).toHaveBeenCalledWith('/admin/users/1/deactivate', {
        method: 'PUT',
      });
    });

    it('resetUserPassword sends POST to reset-password endpoint', async () => {
      mockApiClient.mockResolvedValue({ message: 'ok', temporaryPassword: 'new123' });

      await adminService.resetUserPassword('1');

      expect(mockApiClient).toHaveBeenCalledWith('/admin/users/1/reset-password', {
        method: 'POST',
      });
    });
  });

  describe('assignments', () => {
    it('createAssignment sends POST with user_id and segment_id', async () => {
      const data = { user_id: 'u1', segment_id: 's1' };
      mockApiClient.mockResolvedValue({ id: 'a1', ...data });

      await adminService.createAssignment(data);

      expect(mockApiClient).toHaveBeenCalledWith('/admin/assignments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    });

    it('deleteAssignment sends DELETE to /admin/assignments/:id', async () => {
      mockApiClient.mockResolvedValue({ message: 'ok' });

      await adminService.deleteAssignment('a1');

      expect(mockApiClient).toHaveBeenCalledWith('/admin/assignments/a1', {
        method: 'DELETE',
      });
    });

    it('listSegmentAssignments calls segment-scoped endpoint', async () => {
      mockApiClient.mockResolvedValue([]);

      await adminService.listSegmentAssignments('s1');

      expect(mockApiClient).toHaveBeenCalledWith('/admin/segments/s1/assignments');
    });

    it('listUserAssignments calls user-scoped endpoint', async () => {
      mockApiClient.mockResolvedValue([]);

      await adminService.listUserAssignments('u1');

      expect(mockApiClient).toHaveBeenCalledWith('/admin/users/u1/assignments');
    });
  });
});
