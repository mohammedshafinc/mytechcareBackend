import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { Admin } from '../user/admin.entity';
import * as bcrypt from 'bcryptjs';


@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
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

    return {
      success: true,
      message: 'Login successful',
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




    // Update last login time
    admin.lastLoginAt = new Date();
    await this.adminRepository.save(admin);

    return {
      success: true,
      message: 'Admin login successful',
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        lastLoginAt: admin.lastLoginAt,
      },
    };
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