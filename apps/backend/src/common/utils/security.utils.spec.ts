import { ForbiddenException } from '@nestjs/common';
import { validatePath } from './security.utils';

describe('validatePath()', () => {
  const artifactsRoot = '/artifacts';
  const tenantId = '507f1f77bcf86cd799439011';

  it('should allow valid path within tenant boundary', () => {
    expect(() =>
      validatePath(tenantId, `/artifacts/${tenantId}/workspaces/agent1`, artifactsRoot),
    ).not.toThrow();
  });

  it('should throw ForbiddenException for path outside boundary', () => {
    expect(() =>
      validatePath(tenantId, `/artifacts/other-tenant/workspaces`, artifactsRoot),
    ).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException for path traversal attempt', () => {
    expect(() =>
      validatePath(tenantId, `/artifacts/${tenantId}/../other-tenant/`, artifactsRoot),
    ).toThrow(ForbiddenException);
  });
});
