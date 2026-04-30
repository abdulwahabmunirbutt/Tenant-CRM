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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'List customers with pagination and search' })
  findAll(@OrgUser() user: OrgUserPayload, @Query() dto: PaginateCustomersDto) {
    return this.customersService.findAll(user.organizationId, dto, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @OrgUser() user: OrgUserPayload) {
    return this.customersService.findOne(id, user.organizationId);
  }

  @Post()
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Create a customer' })
  create(@Body() dto: CreateCustomerDto, @OrgUser() user: OrgUserPayload) {
    return this.customersService.create(dto, user.organizationId, user.userId);
  }

  @Put(':id')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Update a customer' })
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
  @ApiOperation({ summary: 'Soft-delete a customer' })
  remove(@Param('id', ParseUUIDPipe) id: string, @OrgUser() user: OrgUserPayload) {
    return this.customersService.remove(id, user.organizationId, user.userId);
  }

  @Patch(':id/restore')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Restore a soft-deleted customer' })
  restore(@Param('id', ParseUUIDPipe) id: string, @OrgUser() user: OrgUserPayload) {
    return this.customersService.restore(id, user.organizationId, user.userId);
  }

  @Patch(':id/assign')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Assign a customer to a user with concurrency safety' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCustomerDto,
    @OrgUser() user: OrgUserPayload,
  ) {
    return this.customersService.assignCustomer(id, dto, user.organizationId, user.userId);
  }
}
