import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserRole } from './user.entity';

export type PublicUser = Omit<User, 'passwordHash' | 'organization' | 'assignedCustomers'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findById(id: string, organizationId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id, organizationId } });
  }

  async findAll(organizationId: string): Promise<PublicUser[]> {
    const users = await this.userRepo.find({
      where: { organizationId },
      order: { createdAt: 'ASC' },
    });
    return users.map((user) => this.toPublicUser(user));
  }

  async create(dto: CreateUserDto, organizationId: string): Promise<PublicUser> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      organizationId,
      name: dto.name,
      email: dto.email,
      role: dto.role ?? UserRole.Member,
      passwordHash,
    });

    return this.toPublicUser(await this.userRepo.save(user));
  }

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      organizationId: user.organizationId,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
