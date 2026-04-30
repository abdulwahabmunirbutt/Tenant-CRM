import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityModule } from '../activity/activity.module';
import { Customer } from '../customers/customer.entity';
import { Note } from './note.entity';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Note, Customer]), ActivityModule],
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
