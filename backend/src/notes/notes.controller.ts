import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgUser, OrgUserPayload } from '../common/decorators/org-user.decorator';
import { CreateNoteDto } from './dto/create-note.dto';
import { NotesService } from './notes.service';

@ApiTags('Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers/:customerId/notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @ApiOperation({ summary: 'List notes for a customer' })
  findForCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @OrgUser() user: OrgUserPayload,
  ) {
    return this.notesService.findForCustomer(customerId, user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a note to a customer' })
  create(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreateNoteDto,
    @OrgUser() user: OrgUserPayload,
  ) {
    return this.notesService.create(customerId, dto, user.organizationId, user.userId);
  }
}

