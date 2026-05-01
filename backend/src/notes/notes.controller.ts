import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({
    summary: '[admin/member] List notes for a customer',
    description:
      'Roles: admin and member. First run GET /customers, then copy a real customer id from data[].id into the customerId path parameter.',
  })
  @ApiParam({
    name: 'customerId',
    description: 'Use a real customer id copied from GET /customers -> data[].id.',
  })
  findForCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @OrgUser() user: OrgUserPayload,
  ) {
    return this.notesService.findForCustomer(customerId, user.organizationId);
  }

  @Post()
  @ApiOperation({
    summary: '[admin/member] Add a note to a customer',
    description:
      'Roles: admin and member. First run GET /customers, then copy a real customer id from data[].id into the customerId path parameter.',
  })
  @ApiParam({
    name: 'customerId',
    description: 'Use a real customer id copied from GET /customers -> data[].id.',
  })
  @ApiBody({
    type: CreateNoteDto,
    examples: {
      note: {
        summary: 'Add customer note',
        value: { content: 'Followed up with the customer about renewal timing.' },
      },
    },
  })
  create(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreateNoteDto,
    @OrgUser() user: OrgUserPayload,
  ) {
    return this.notesService.create(customerId, dto, user.organizationId, user.userId);
  }
}
