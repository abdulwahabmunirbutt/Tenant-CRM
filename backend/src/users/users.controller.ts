import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OrgUser, OrgUserPayload } from '../common/decorators/org-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRole } from './user.entity';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: '[admin/member] List users in the current organization',
    description: 'Roles: admin and member. Returns only users from the organization encoded in the JWT.',
  })
  findAll(@OrgUser() user: OrgUserPayload) {
    return this.usersService.findAll(user.organizationId);
  }

  @Post()
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: '[admin] Create a user in the current organization',
    description: 'Role: admin only. The organization is taken from the JWT; do not send organizationId.',
  })
  @ApiBody({
    type: CreateUserDto,
    examples: {
      member: {
        summary: 'Create member',
        value: {
          name: 'Maya Member',
          email: 'maya.member@example.com',
          password: 'password123',
          role: 'member',
        },
      },
      admin: {
        summary: 'Create admin',
        value: {
          name: 'Omar Admin',
          email: 'omar.admin@example.com',
          password: 'password123',
          role: 'admin',
        },
      },
    },
  })
  create(@Body() dto: CreateUserDto, @OrgUser() user: OrgUserPayload) {
    return this.usersService.create(dto, user.organizationId);
  }
}
