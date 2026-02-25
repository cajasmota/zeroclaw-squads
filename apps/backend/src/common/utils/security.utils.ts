import { ForbiddenException } from '@nestjs/common';
import * as path from 'path';

export function validatePath(
  tenantId: string,
  filePath: string,
  artifactsRoot: string,
): void {
  const expectedPrefix = path.resolve(artifactsRoot, tenantId) + path.sep;
  const resolvedPath =
    path.resolve(filePath) + (filePath.endsWith(path.sep) ? path.sep : '');

  if (
    !resolvedPath.startsWith(expectedPrefix) &&
    resolvedPath !== path.resolve(artifactsRoot, tenantId)
  ) {
    throw new ForbiddenException(
      `Path ${filePath} is outside the allowed boundary for tenant ${tenantId}`,
    );
  }
}
