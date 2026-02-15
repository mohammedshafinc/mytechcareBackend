import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { Admin } from '../user/admin.entity';
import { UserModuleEntity } from '../module/user-module.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { BlockLoginDto } from './dto/block-login.dto';
import { MODULE_CODES } from './constants/modules.constants';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    @InjectRepository(UserModuleEntity)
    private userModuleRepository: Repository<UserModuleEntity>,
    private readonly jwtService: JwtService,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  /** All module codes from the shared constant (use for SUPER_ADMIN or as reference list). */
  getAllModuleCodes(): string[] {
    return [...MODULE_CODES];
  }

  /**
   * Get all available modules
   */
  async getAllModules(): Promise<{ code: string; name: string | null }[]> {
    const rows = await this.dataSource.query<
      { code: string; name: string | null }[]
    >('SELECT code, name FROM modules ORDER BY code');
    return rows;
  }

  /**
   * Returns module codes allowed for the given role.
   * SUPER_ADMIN gets all modules; other roles are resolved from role_modules.
   */
  async getModulesForRole(role: string): Promise<string[]> {
    if (role === 'SUPER_ADMIN') {
      return this.getAllModuleCodes();
    }
    const rows = await this.dataSource.query<{ module_code: string }[]>(
      'SELECT module_code FROM role_modules WHERE role = $1',
      [role],
    );
    return rows.map((r) => r.module_code);
  }

  /**
   * Get modules for a specific user (user-level > role-level for non-SUPER_ADMIN)
   */
  async getModulesForUser(userId: number): Promise<string[]> {
    const admin = await this.adminRepository.findOne({ where: { id: userId } });
    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    // SUPER_ADMIN always gets all modules
    if (admin.role === 'SUPER_ADMIN') {
      return this.getAllModuleCodes();
    }

    // Check for user-specific modules first
    const userModules = await this.dataSource.query<{ module_code: string }[]>(
      'SELECT module_code FROM user_modules WHERE user_id = $1',
      [userId],
    );

    if (userModules.length > 0) {
      return userModules.map((r) => r.module_code);
    }

    // Fall back to role-based modules
    return this.getModulesForRole(admin.role ?? 'ADMIN');
  }

  /**
   * Get all users with their modules for RBAC management
   */
  async getAllUsersWithModules(): Promise<{
    users: Array<{
      id: number;
      name: string | null;
      email: string;
      role: string;
      isActive: boolean;
      modules: string[];
      hasCustomModules: boolean;
      viewOnly: boolean;
    }>;
    allModules: { code: string; name: string | null }[];
  }> {
    const admins = await this.adminRepository.find({
      order: { createdAt: 'DESC' },
    });

    const allModules = await this.getAllModules();
    const allModuleCodes = this.getAllModuleCodes();

    const users = await Promise.all(
      admins.map(async (admin) => {
        // Check for user-specific modules
        const userModules = await this.dataSource.query<
          { module_code: string }[]
        >('SELECT module_code FROM user_modules WHERE user_id = $1', [admin.id]);

        let modules: string[];
        let hasCustomModules = false;

        if (admin.role === 'SUPER_ADMIN') {
          modules = allModuleCodes;
        } else if (userModules.length > 0) {
          modules = userModules.map((r) => r.module_code);
          hasCustomModules = true;
        } else {
          modules = await this.getModulesForRole(admin.role ?? 'ADMIN');
        }

        return {
          id: admin.id,
          name: admin.name ?? null,
          email: admin.email,
          role: admin.role ?? 'ADMIN',
          isActive: admin.isActive,
          modules,
          hasCustomModules,
          viewOnly: admin.viewOnly ?? false,
        };
      }),
    );

    return { users, allModules };
  }

  /**
   * Update modules for a specific user
   */
  async updateUserModules(
    userId: number,
    modules: string[],
    requestingUserId: number,
  ): Promise<{ success: boolean; message: string; modules: string[] }> {
    const admin = await this.adminRepository.findOne({ where: { id: userId } });
    if (!admin) {
      throw new BadRequestException('User not found');
    }

    // Prevent modifying SUPER_ADMIN permissions
    if (admin.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot modify Super Admin permissions');
    }

    // Prevent self-modification (optional security)
    if (userId === requestingUserId) {
      throw new BadRequestException('Cannot modify your own permissions');
    }

    // Validate module codes
    const validModules = this.getAllModuleCodes();
    const invalidModules = modules.filter((m) => !validModules.includes(m));
    if (invalidModules.length > 0) {
      throw new BadRequestException(
        `Invalid module codes: ${invalidModules.join(', ')}`,
      );
    }

    // Delete existing user modules
    await this.dataSource.query('DELETE FROM user_modules WHERE user_id = $1', [
      userId,
    ]);

    // Insert new modules
    for (const moduleCode of modules) {
      await this.dataSource.query(
        'INSERT INTO user_modules (user_id, module_code) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, moduleCode],
      );
    }

    return {
      success: true,
      message: 'User modules updated successfully',
      modules,
    };
  }

  /**
   * Reset user to role-based modules (remove custom assignments)
   */
  async resetUserToRoleModules(
    userId: number,
    requestingUserId: number,
  ): Promise<{ success: boolean; message: string; modules: string[] }> {
    const admin = await this.adminRepository.findOne({ where: { id: userId } });
    if (!admin) {
      throw new BadRequestException('User not found');
    }

    if (admin.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot modify Super Admin permissions');
    }

    if (userId === requestingUserId) {
      throw new BadRequestException('Cannot modify your own permissions');
    }

    // Delete user-specific modules
    await this.dataSource.query('DELETE FROM user_modules WHERE user_id = $1', [
      userId,
    ]);

    // Return role-based modules
    const modules = await this.getModulesForRole(admin.role ?? 'ADMIN');

    return {
      success: true,
      message: 'User reset to role-based modules',
      modules,
    };
  }

  /**
   * Loads admin by id, resolves modules for their role, and returns
   * { id, email, name, role, modules, viewOnly }. Throws if admin not found.
   */
  async getAdminMe(userId: number): Promise<{
    id: number;
    email: string;
    name: string | null;
    role: string;
    modules: string[];
    viewOnly: boolean;
  }> {
    const admin = await this.adminRepository.findOne({ where: { id: userId } });
    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }
    const modules = await this.getModulesForUser(admin.id);
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name ?? null,
      role: admin.role ?? 'SUPER_ADMIN',
      modules,
      viewOnly: admin.viewOnly ?? false,
    };
  }

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
      throw new UnauthorizedException('Authentication blocked for this account');
    }

    // Verify password
    const storedHash = admin.password.trim();
    const isPasswordValid = await bcrypt.compare(password, storedHash);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }




    const role = admin.role || 'SUPER_ADMIN';
    const modules = await this.getModulesForUser(admin.id);
    const payload = {
      sub: admin.id,
      email: admin.email,
      role,
      modules,
      viewOnly: admin.viewOnly ?? false,
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

  async refreshAccessToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      }) as { sub: number; email?: string; role?: string; modules?: string[]; viewOnly?: boolean };

      if (
        typeof decoded !== 'object' ||
        decoded === null ||
        !('sub' in decoded)
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const admin = await this.adminRepository.findOne({ where: { id: decoded.sub } });
      if (!admin) {
        throw new UnauthorizedException('Admin not found');
      }

      const modules = await this.getModulesForUser(decoded.sub);
      const role = decoded.role ?? 'SUPER_ADMIN';
      const payload = {
        sub: decoded.sub,
        email: decoded.email,
        role,
        modules,
        viewOnly: admin.viewOnly ?? false,
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
      viewOnly: admin.viewOnly ?? false,
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

  async createAdminUser(dto: CreateAdminUserDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existing = await this.adminRepository
      .createQueryBuilder('admin')
      .where('LOWER(admin.email) = LOWER(:email)', { email: normalizedEmail })
      .getOne();

    if (existing) {
      throw new ConflictException('An admin with this email already exists');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    const admin = this.adminRepository.create({
      email: normalizedEmail,
      password: hashedPassword,
      role: dto.role,
      ...(dto.name != null && dto.name !== '' && { name: dto.name }),
      isActive: true,
      viewOnly: dto.viewOnly ?? false,
    });

    const saved = await this.adminRepository.save(admin);

    return {
      success: true,
      message: 'Admin user created successfully. They can log in with this email and password.',
      admin: {
        id: saved.id,
        email: saved.email,
        viewOnly: saved.viewOnly,
        name: saved.name,
        role: saved.role,
        isActive: saved.isActive,
        createdAt: saved.createdAt,
      },
    };
  }

  /**
   * Update an existing admin user by id. Only provided fields are updated.
   */
  async updateAdminUser(userId: number, dto: UpdateAdminUserDto) {
    const admin = await this.adminRepository.findOne({ where: { id: userId } });
    if (!admin) {
      throw new BadRequestException('User not found');
    }

    if (dto.email != null) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const existing = await this.adminRepository
        .createQueryBuilder('admin')
        .where('LOWER(admin.email) = LOWER(:email)', { email: normalizedEmail })
        .andWhere('admin.id != :userId', { userId })
        .getOne();
      if (existing) {
        throw new ConflictException('An admin with this email already exists');
      }
      admin.email = normalizedEmail;
    }

    if (dto.password != null) {
      const saltRounds = 10;
      admin.password = await bcrypt.hash(dto.password, saltRounds);
    }

    if (dto.role != null) {
      admin.role = dto.role;
    }

    if (dto.name !== undefined) {
      admin.name = dto.name ?? null;
    }

    if (dto.isActive !== undefined) {
      admin.isActive = dto.isActive;
    }

    if (dto.viewOnly !== undefined) {
      admin.viewOnly = dto.viewOnly;
    }

    const saved = await this.adminRepository.save(admin);

    return {
      success: true,
      message: 'Admin user updated successfully',
      admin: {
        id: saved.id,
        email: saved.email,
        name: saved.name,
        role: saved.role,
        isActive: saved.isActive,
        viewOnly: saved.viewOnly ?? false,
        createdAt: saved.createdAt,
        lastLoginAt: saved.lastLoginAt,
      },
    };
  }

  /**
   * Block or unblock login for an admin user. When blocked, admin cannot log in.
   */
  async setBlockLogin(userId: number, dto: BlockLoginDto) {
    const admin = await this.adminRepository.findOne({ where: { id: userId } });
    if (!admin) {
      throw new BadRequestException('User not found');
    }
    admin.isActive = !dto.blocked;
    await this.adminRepository.save(admin);
    return {
      success: true,
      message: dto.blocked
        ? 'Login blocked for this account'
        : 'Login allowed for this account',
      blocked: dto.blocked,
      userId: admin.id,
    };
  }

  /**
   * Delete an admin user by id. Removes user_modules first, then the admin.
   * Cannot delete SUPER_ADMIN or yourself.
   */
  async deleteAdminUser(userId: number, requestingUserId: number) {
    const admin = await this.adminRepository.findOne({ where: { id: userId } });
    if (!admin) {
      throw new NotFoundException('User not found');
    }
    if (admin.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot delete Super Admin');
    }
    if (userId === requestingUserId) {
      throw new BadRequestException('Cannot delete your own account');
    }
    await this.dataSource.query('DELETE FROM user_modules WHERE user_id = $1', [userId]);
    await this.adminRepository.remove(admin);
    return {
      success: true,
      message: 'Admin user deleted successfully',
      userId,
    };
  }
}