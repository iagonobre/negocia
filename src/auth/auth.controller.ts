import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginEmpresaDto } from './dto/login-empresa.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login de empresa' })
  @ApiBody({ type: LoginEmpresaDto })
  async login(@Body() dto: LoginEmpresaDto) {
    return this.authService.login(dto);
  }
}
