import { prisma } from './prisma.client';

export interface AuthorityRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthorityRepository {
  private memStore: Map<string, AuthorityRecord> = new Map();

  public async findByEmail(email: string): Promise<AuthorityRecord | null> {
    try {
      if (prisma.authority) {
        return (await prisma.authority.findUnique({ where: { email } })) as AuthorityRecord | null;
      }
    } catch {
      // fallback to memStore
    }
    for (const auth of this.memStore.values()) {
      if (auth.email.toLowerCase() === email.toLowerCase()) return auth;
    }
    return null;
  }

  public async findById(id: string): Promise<AuthorityRecord | null> {
    try {
      if (prisma.authority) {
        return (await prisma.authority.findUnique({ where: { id } })) as AuthorityRecord | null;
      }
    } catch {
      // fallback
    }
    return this.memStore.get(id) || null;
  }

  public async create(data: Omit<AuthorityRecord, 'createdAt' | 'updatedAt'>): Promise<AuthorityRecord> {
    const record: AuthorityRecord = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      if (prisma.authority) {
        return (await prisma.authority.create({ data })) as AuthorityRecord;
      }
    } catch {
      // fallback
    }

    this.memStore.set(record.id, record);
    return record;
  }

  public async findAll(): Promise<AuthorityRecord[]> {
    try {
      if (prisma.authority) {
        return (await prisma.authority.findMany({
          orderBy: { createdAt: 'desc' }
        })) as AuthorityRecord[];
      }
    } catch {
      // fallback
    }
    return Array.from(this.memStore.values());
  }

  public clearMemoryStore(): void {
    this.memStore.clear();
  }
}

export const authorityRepository = new AuthorityRepository();
