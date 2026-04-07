import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmpresaService } from '../empresa/empresa.service';
import { LoginEmpresaDto } from './dto/login-empresa.dto';
import * as bcrypt from 'bcrypt';

type LoginResultado = {
  access_token: string;
  empresa: { id: string; nome: string; email: string };
};

@Injectable()
export class AuthService {
  constructor(
    private empresaService: EmpresaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginEmpresaDto): Promise<LoginResultado> {
    const empresa = await this.empresaService.buscarPorEmail(dto.email);

    if (!empresa) {
      throw new UnauthorizedException('Credenciais inválidas, tente novamente.');
    }

    const senhaValida = await bcrypt.compare(dto.senha, empresa.senha);

    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas, tente novamente.');
    }

    const payload = { sub: empresa.id, email: empresa.email };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      empresa: {
        id: empresa.id,
        nome: empresa.nome,
        email: empresa.email,
      },
    };
  }
}
