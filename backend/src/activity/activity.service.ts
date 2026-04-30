import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ActivityAction, ActivityEntityType, ActivityLog } from './activity-log.entity';

export interface ActivityLogInput {
  organizationId: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: ActivityAction;
  performedBy: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityRepo: Repository<ActivityLog>,
  ) {}

  async log(input: ActivityLogInput): Promise<ActivityLog> {
    const activity = this.activityRepo.create({
      ...input,
      metadata: input.metadata ?? null,
    });
    return this.activityRepo.save(activity);
  }

  async logWithManager(manager: EntityManager, input: ActivityLogInput): Promise<ActivityLog> {
    const activity = manager.create(ActivityLog, {
      ...input,
      metadata: input.metadata ?? null,
    });
    return manager.save(ActivityLog, activity);
  }

  async findForEntity(organizationId: string, entityType: ActivityEntityType, entityId: string) {
    return this.activityRepo.find({
      where: { organizationId, entityType, entityId },
      relations: ['performedByUser'],
      order: { timestamp: 'DESC' },
    });
  }
}

