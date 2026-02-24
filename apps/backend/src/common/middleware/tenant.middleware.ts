import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const user = (req as any).user;
    if (user?.tenantId) {
      (req as any).tenantId = new Types.ObjectId(user.tenantId);
    }
    next();
  }
}
