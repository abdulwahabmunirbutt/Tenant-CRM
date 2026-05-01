import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: '[public] Login with email and password',
    description:
      'Public endpoint. Use alice@acme.com / password123 for an admin token, or bob@acme.com / password123 for a member token.',
  })
  @ApiBody({
    type: LoginDto,
    examples: {
      admin: {
        summary: 'Acme admin',
        value: { email: 'alice@acme.com', password: 'password123' },
      },
      member: {
        summary: 'Acme member',
        value: { email: 'bob@acme.com', password: 'password123' },
      },
    },
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }
}
