import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ActivityService } from '../activity/activity.service';
import { Customer } from '../customers/customer.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { Note } from './note.entity';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepo: Repository<Note>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly activityService: ActivityService,
  ) {}

  async findForCustomer(customerId: string, organizationId: string) {
    await this.assertCustomerVisible(customerId, organizationId);
    return this.noteRepo.find({
      where: { customerId, organizationId },
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(customerId: string, dto: CreateNoteDto, organizationId: string, userId: string) {
    await this.assertCustomerVisible(customerId, organizationId);
    const note = this.noteRepo.create({
      customerId,
      organizationId,
      content: dto.content,
      createdBy: userId,
    });

    const saved = await this.noteRepo.save(note);
    await this.activityService.log({
      organizationId,
      entityType: 'note',
      entityId: saved.id,
      action: 'note_added',
      performedBy: userId,
      metadata: { customerId },
    });

    return saved;
  }

  private async assertCustomerVisible(customerId: string, organizationId: string) {
    const customer = await this.customerRepo.findOne({
      where: { id: customerId, organizationId, deletedAt: IsNull() },
    });
    if (!customer) throw new NotFoundException('Customer not found');
  }
}

