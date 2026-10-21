import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestUser } from './module.guard';

@Injectable()
export class ViewOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: RequestUser; method: string }>();
    const user = request.user;
    const method = request.method;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // SUPER_ADMIN can always perform write operations
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Block write operations (POST, PUT, PATCH, DELETE) for view-only users
    if (user.viewOnly && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      throw new ForbiddenException('View-only users cannot perform write operations');
    }

    return true;
  }
}
