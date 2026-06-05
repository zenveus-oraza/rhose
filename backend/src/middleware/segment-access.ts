import { Request, Response, NextFunction } from 'express';
import { segmentAccessService } from '../services/segment-access.service.js';

/**
 * Express middleware that restricts access to learner users only.
 * Must be used after the `authenticate` middleware.
 * Returns 403 with { success: false, error: { code: "FORBIDDEN", message } } if not a learner.
 */
export function requireLearner(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'learner') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Learner access required',
      },
    });
    return;
  }

  next();
}

/**
 * Express middleware that verifies a learner has access to a specific segment.
 * Must be used after the `authenticate` middleware.
 * Checks that the user is a learner, then calls SegmentAccessService to verify
 * the learner is assigned to and can access the segment from req.params.segmentId.
 * Returns 403 with appropriate error codes on denial.
 */
export async function requireSegmentAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user || req.user.role !== 'learner') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Learner access required',
      },
    });
    return;
  }

  const { segmentId } = req.params;

  const result = await segmentAccessService.verifyAccess(req.user.userId, segmentId);

  if (!result.granted) {
    const messages: Record<string, string> = {
      ACCESS_DENIED: 'You are not assigned to this segment',
      ACCESS_EXPIRED: 'Your access to this segment has expired',
      SEGMENT_UNAVAILABLE: 'This segment is not currently available',
    };

    res.status(403).json({
      success: false,
      error: {
        code: result.code,
        message: messages[result.code],
      },
    });
    return;
  }

  next();
}
