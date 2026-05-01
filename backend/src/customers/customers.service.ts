import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { ActivityService } from '../activity/activity.service';
import { User, UserRole } from '../users/user.entity';
import { AssignCustomerDto } from './dto/assign-customer.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { PaginateCustomersDto } from './dto/paginate-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly activityService: ActivityService,
  ) {}

  async findAll(organizationId: string, dto: PaginateCustomersDto, role: UserRole) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;
    const canViewDeleted = role === UserRole.Admin && dto.deletedOnly === true;

    const qb = this.customerRepo
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.assignedUser', 'assignedUser')
      .where('customer.organization_id = :organizationId', { organizationId });

    if (canViewDeleted) {
      qb.withDeleted().andWhere('customer.deleted_at IS NOT NULL');
    } else {
      qb.andWhere('customer.deleted_at IS NULL');
    }

    if (dto.search) {
      qb.andWhere('(customer.name ILIKE :search OR customer.email ILIKE :search)', {
        search: `%${dto.search}%`,
      });
    }

    const [customers, total] = await qb
      .orderBy('customer.createdAt', 'DESC')
      .addOrderBy('customer.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: customers,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, organizationId: string) {
    const customer = await this.customerRepo.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
      relations: ['assignedUser'],
    });

    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(dto: CreateCustomerDto, organizationId: string, userId: string) {
    const customer = this.customerRepo.create({
      ...dto,
      phone: dto.phone ?? null,
      organizationId,
    });
    const saved = await this.customerRepo.save(customer);

    await this.activityService.log({
      organizationId,
      entityType: 'customer',
      entityId: saved.id,
      action: 'created',
      performedBy: userId,
    });

    return saved;
  }

  async update(id: string, dto: UpdateCustomerDto, organizationId: string, userId: string) {
    const customer = await this.findOne(id, organizationId);
    Object.assign(customer, dto);
    const saved = await this.customerRepo.save(customer);

    await this.activityService.log({
      organizationId,
      entityType: 'customer',
      entityId: id,
      action: 'updated',
      performedBy: userId,
      metadata: { ...dto },
    });

    return saved;
  }

  async remove(id: string, organizationId: string, userId: string) {
    const customer = await this.findOne(id, organizationId);
    await this.customerRepo.softRemove(customer);

    await this.activityService.log({
      organizationId,
      entityType: 'customer',
      entityId: id,
      action: 'deleted',
      performedBy: userId,
    });
  }

  async restore(id: string, organizationId: string, userId: string) {
    const customer = await this.customerRepo.findOne({
      where: { id, organizationId },
      withDeleted: true,
    });
    if (!customer) throw new NotFoundException('Customer not found');

    await this.customerRepo.restore(id);
    await this.activityService.log({
      organizationId,
      entityType: 'customer',
      entityId: id,
      action: 'restored',
      performedBy: userId,
    });

    return this.findOne(id, organizationId);
  }

  async assignCustomer(
    customerId: string,
    dto: AssignCustomerDto,
    organizationId: string,
    performedBy: string,
  ) {
    if (dto.assigneeId === null) {
      return this.unassignCustomer(customerId, organizationId, performedBy);
    }
    const assigneeId = dto.assigneeId;

    return this.dataSource.transaction(async (manager) => {
      const lockKey = this.hashUuidToBigIntString(assigneeId);
      await manager.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);

      const assignee = await manager.findOne(User, {
        where: { id: assigneeId, organizationId },
      });
      if (!assignee) throw new NotFoundException('Assignee not found');

      const customer = await manager.findOne(Customer, {
        where: { id: customerId, organizationId, deletedAt: IsNull() },
      });
      if (!customer) throw new NotFoundException('Customer not found');
      if (customer.assignedTo === assigneeId) return customer;

      const activeCount = await manager.count(Customer, {
        where: { assignedTo: assigneeId, organizationId, deletedAt: IsNull() },
      });

      if (activeCount >= 5) {
        throw new ConflictException(
          "This member already has 5 active customers assigned, so you can't assign another customer.",
        );
      }

      const previousAssignee = customer.assignedTo;
      customer.assignedTo = assigneeId;
      await manager.save(Customer, customer);

      await this.activityService.logWithManager(manager, {
        organizationId,
        entityType: 'customer',
        entityId: customerId,
        action: 'assigned',
        performedBy,
        metadata: { previousAssignee, assignedTo: assigneeId },
      });

      return manager.findOneOrFail(Customer, {
        where: { id: customerId },
        relations: ['assignedUser'],
      });
    });
  }

  private hashUuidToBigIntString(uuid: string): string {
    const hex = uuid.replace(/-/g, '').slice(0, 15);
    return BigInt(`0x${hex}`).toString();
  }

  private async unassignCustomer(customerId: string, organizationId: string, performedBy: string) {
    return this.dataSource.transaction(async (manager) => {
      const customer = await manager.findOne(Customer, {
        where: { id: customerId, organizationId, deletedAt: IsNull() },
      });
      if (!customer) throw new NotFoundException('Customer not found');
      if (customer.assignedTo === null) return customer;

      const previousAssignee = customer.assignedTo;
      customer.assignedTo = null;
      await manager.save(Customer, customer);

      await this.activityService.logWithManager(manager, {
        organizationId,
        entityType: 'customer',
        entityId: customerId,
        action: 'assigned',
        performedBy,
        metadata: { previousAssignee, assignedTo: null },
      });

      return manager.findOneOrFail(Customer, {
        where: { id: customerId },
        relations: ['assignedUser'],
      });
    });
  }
}
