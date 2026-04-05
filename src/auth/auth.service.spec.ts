import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { EmpresaService } from '../empresa/empresa.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

const mockEmpresa = {
  id: 'uuid-123',
  nome: 'Empresa do João',
  email: 'contato@joao.com',
  senha: 'hash-da-senha',
  cnpj: '12345678000190',
  telefone: '84999999999',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockEmpresaService = {
  buscarPorEmail: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('token-jwt-fake'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: EmpresaService,
          useValue: mockEmpresaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const dto = {
      email: 'contato@joao.com',
      senha: '123456',
    };

    it('deve retornar token e dados da empresa ao logar com sucesso', async () => {
      mockEmpresaService.buscarPorEmail.mockResolvedValue(mockEmpresa);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const resultado = await service.login(dto);

      expect(resultado).toHaveProperty('access_token', 'token-jwt-fake');
      expect(resultado.empresa.email).toBe(mockEmpresa.email);
      expect(resultado.empresa).not.toHaveProperty('senha');
    });

    it('deve lançar UnauthorizedException se email não encontrado', async () => {
      mockEmpresaService.buscarPorEmail.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException se senha incorreta', async () => {
      mockEmpresaService.buscarPorEmail.mockResolvedValue(mockEmpresa);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });
});
