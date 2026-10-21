import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/** JWT payload for admin: { sub, email, role, modules, viewOnly }. modules come from login/refresh. */
export type JwtPayload = {
  sub: number;
  email?: string;
  role?: string;
  modules?: string[];
  viewOnly?: boolean;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    });
  }

  /** Pass through payload; modules are already in the token (set at login/refresh). */
  validate(payload: JwtPayload) {
    return payload;
  }
}

