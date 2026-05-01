import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OrgUser, OrgUserPayload } from '../common/decorators/org-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { AssignCustomerDto } from './dto/assign-customer.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { PaginateCustomersDto } from './dto/paginate-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({
    summary: '[admin/member] List customers with pagination and search',
    description:
      'Roles: admin and member. Normal requests return active customers only. Admins may pass deletedOnly=true to view soft-deleted customers.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false, example: 'Acme Customer 10' })
  @ApiQuery({ name: 'deletedOnly', required: false, example: false })
  findAll(@OrgUser() user: OrgUserPayload, @Query() dto: PaginateCustomersDto) {
    return this.customersService.findAll(user.organizationId, dto, user.role);
  }

  @Get(':id')
  @ApiOperation({
    summary: '[admin/member] Get a customer by ID',
    description:
      'Roles: admin and member. First run GET /customers, then copy a real customer id from data[].id into the id path parameter.',
  })
  @ApiParam({
    name: 'id',
    description: 'Use a real customer id copied from GET /customers -> data[].id.',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string, @OrgUser() user: OrgUserPayload) {
    return this.customersService.findOne(id, user.organizationId);
  }

  @Post()
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: '[admin] Create a customer',
    description: 'Role: admin only. The organization is taken from the JWT; do not send organizationId.',
  })
  @ApiBody({
    type: CreateCustomerDto,
    examples: {
      customer: {
        summary: 'Create customer',
        value: {
          name: 'Nadia Buyer',
          email: 'nadia.buyer@example.com',
          phone: '+15551234567',
        },
      },
    },
  })
  create(@Body() dto: CreateCustomerDto, @OrgUser() user: OrgUserPayload) {
    return this.customersService.create(dto, user.organizationId, user.userId);
  }

  @Put(':id')
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: '[admin] Update a customer',
    description:
      'Role: admin only. First run GET /customers, then copy a real customer id from data[].id into the id path parameter.',
  })
  @ApiParam({
    name: 'id',
    description: 'Use a real customer id copied from GET /customers -> data[].id.',
  })
  @ApiBody({
    type: UpdateCustomerDto,
    examples: {
      update: {
        summary: 'Update customer',
        value: {
          name: 'Nadia Buyer Updated',
          email: 'nadia.updated@example.com',
          phone: '+15557654321',
        },
      },
    },
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @OrgUser() user: OrgUserPayload,
  ) {
    return this.customersService.update(id, dto, user.organizationId, user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '[admin] Soft-delete a customer',
    description:
      'Role: admin only. First run GET /customers, then copy a real customer id from data[].id. Notes and activity logs remain stored after soft delete.',
  })
  @ApiParam({
    name: 'id',
    description: 'Use a real customer id copied from GET /customers -> data[].id.',
  })
  remove(@Param('id', ParseUUIDPipe) id: string, @OrgUser() user: OrgUserPayload) {
    return this.customersService.remove(id, user.organizationId, user.userId);
  }

  @Patch(':id/restore')
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: '[admin] Restore a soft-deleted customer',
    description:
      'Role: admin only. First call GET /customers?deletedOnly=true with an admin token and copy a deleted customer id.',
  })
  @ApiParam({
    name: 'id',
    description: 'Use a real deleted customer id copied from GET /customers?deletedOnly=true -> data[].id.',
  })
  restore(@Param('id', ParseUUIDPipe) id: string, @OrgUser() user: OrgUserPayload) {
    return this.customersService.restore(id, user.organizationId, user.userId);
  }

  @Patch(':id/assign')
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: '[admin] Assign a customer to a user with concurrency safety',
    description:
      'Role: admin only. Working test flow: run GET /customers and copy an unassigned customer id into the id path parameter, then run GET /users and copy Bob Member or Dave Member id into assigneeId. Bob and Dave are seeded with 5 active customers, so assigning another active customer to them returns 409.',
  })
  @ApiParam({
    name: 'id',
    description: 'Use a real customer id copied from GET /customers -> data[].id.',
  })
  @ApiBody({
    type: AssignCustomerDto,
    examples: {
      unassign: {
        summary: 'Unassign customer',
        value: { assigneeId: null },
      },
    },
  })
  @ApiConflictResponse({
    description: "This member already has 5 active customers assigned, so you can't assign another customer.",
  })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCustomerDto,
    @OrgUser() user: OrgUserPayload,
  ) {
    return this.customersService.assignCustomer(id, dto, user.organizationId, user.userId);
  }
}
