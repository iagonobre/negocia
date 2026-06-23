import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';

const mockRetornoLogin = {
  access_token: 'token-jwt-fake',
  empresa: {
    id: 'uuid-123',
    nome: 'Empresa do João',
    email: 'contato@joao.com',
  },
};

const mockAuthService = {
  login: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    const dto = {
      email: 'contato@joao.com',
      senha: '123456',
    };

    it('deve retornar token ao logar com sucesso', async () => {
      mockAuthService.login.mockResolvedValue(mockRetornoLogin);

      const resultado = await controller.login(dto);

      expect(resultado).toEqual(mockRetornoLogin);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    });

    it('deve lançar UnauthorizedException se credenciais inválidas', async () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedException());

      await expect(controller.login(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
