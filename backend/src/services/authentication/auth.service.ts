import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { authorityRepository, AuthorityRecord } from '../../repositories/authority.repository';
import { UnauthorizedError, BadRequestError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
}

export class AuthService {
  private saltRounds = 10;

  public async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
  }

  public async verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, passwordHash);
  }

  public generateToken(user: AuthorityRecord): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });
  }

  public verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Authentication token has expired. Please log in again.');
      }
      throw new UnauthorizedError('Invalid authentication token');
    }
  }

  public async login(email: string, password: string): Promise<{ user: Omit<AuthorityRecord, 'passwordHash'>; token: string }> {
    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    const user = await authorityRepository.findByEmail(email);
    if (!user || !user.isActive) {
      logger.warn('Failed login attempt for non-existent or inactive user', { email });
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await this.verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      logger.warn('Failed login attempt: incorrect password', { email });
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = this.generateToken(user);
    const { passwordHash, ...userWithoutPassword } = user;

    logger.info('Authority user logged in successfully', { userId: user.id, role: user.role, email: user.email });
    return { user: userWithoutPassword, token };
  }

  public async seedDefaultAuthorities(): Promise<void> {
    const defaultUsers = [
      {
        id: 'auth-admin-01',
        email: 'admin@shesecure.org',
        name: 'Commander Sarah Connor',
        role: 'ADMIN' as const,
        password: 'AdminPassword123!'
      },
      {
        id: 'auth-operator-01',
        email: 'operator@shesecure.org',
        name: 'Dispatch Operator Alex Rivera',
        role: 'OPERATOR' as const,
        password: 'OperatorPassword123!'
      },
      {
        id: 'auth-viewer-01',
        email: 'viewer@shesecure.org',
        name: 'Auditor Maya Patel',
        role: 'VIEWER' as const,
        password: 'ViewerPassword123!'
      }
    ];

    for (const def of defaultUsers) {
      const existing = await authorityRepository.findByEmail(def.email);
      if (!existing) {
        const passwordHash = await this.hashPassword(def.password);
        await authorityRepository.create({
          id: def.id,
          email: def.email,
          name: def.name,
          role: def.role,
          passwordHash,
          isActive: true
        });
        logger.info(`Seeded authority account: ${def.email} (${def.role})`);
      }
    }
  }
}

export const authService = new AuthService();
