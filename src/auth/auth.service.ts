import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { Admin } from '../user/admin.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';


@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    private readonly jwtService: JwtService,
  ) {}

  async login(number: string) {
    if (!number) {
      throw new BadRequestException('Number is Required');
    }

    const saudiRegex = /^(?:\+966|966|0)?5\d{8}$/;
    if (!saudiRegex.test(number)) {
      throw new BadRequestException('Invalid Saudi mobile number');
    }

    // Normalize phone number (remove +966, 966, or leading 0)
    const normalizedNumber = number.replace(/^(\+966|966|0)/, '');

    // Check if user exists
    let user = await this.userRepository.findOne({
      where: { phoneNumber: normalizedNumber },
    });

    if (user) {
      // Update last login time
      user.lastLoginAt = new Date();
      await this.userRepository.save(user);
    } else {
      // Create new user
      user = this.userRepository.create({
        phoneNumber: normalizedNumber,
        lastLoginAt: new Date(),
      });
      await this.userRepository.save(user);
    }

    // Generate JWT tokens
    const payload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      role: 'user',
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    return {
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        lastLoginAt: user.lastLoginAt,
      },
    };
  }

  async adminLogin(email: string, password: string) {
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    // Normalize email (trim and lowercase)
    const normalizedEmail = email.trim().toLowerCase();

    // Find admin by email (case-insensitive)
    const admin = await this.adminRepository
      .createQueryBuilder('admin')
      .where('LOWER(admin.email) = LOWER(:email)', { email: normalizedEmail })
      .getOne();

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Admin account is inactive');
    }

    // Verify password
    const storedHash = admin.password.trim();
    const isPasswordValid = await bcrypt.compare(password, storedHash);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }




    const payload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role || 'SUPER_ADMIN',
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    // Update last login time
    admin.lastLoginAt = new Date();
    await this.adminRepository.save(admin);

    return {
      success: true,
      message: 'Admin login successful',
      accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        lastLoginAt: admin.lastLoginAt,
      },
    };
  }

  refreshAccessToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      if (
        typeof decoded !== 'object' ||
        decoded === null ||
        !('sub' in decoded)
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const payload = {
        sub: (decoded as any).sub,
        email: (decoded as any).email,
        role: (decoded as any).role,
      };

      const accessToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
      });

      return {
        success: true,
        accessToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getAllAdmins() {
    const admins = await this.adminRepository.find({
      order: { createdAt: 'DESC' },
    });

    // Remove password from response for security
    const adminsWithoutPassword = admins.map((admin) => ({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      lastLoginAt: admin.lastLoginAt,
    }));

    return {
      success: true,
      message: 'Admins fetched successfully',
      count: adminsWithoutPassword.length,
      admins: adminsWithoutPassword,
    };
  }
}