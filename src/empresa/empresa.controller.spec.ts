import { Test, TestingModule } from '@nestjs/testing';
import { EmpresaController } from './empresa.controller';
import { EmpresaService } from './empresa.service';
import { AuthGuard } from '../auth/auth.guard';

const mockEmpresa = {
  id: 'uuid-123',
  nome: 'Empresa do João',
  email: 'contato@joao.com',
  cnpj: '12345678000190',
  telefone: '84999999999',
  createdAt: new Date(),
  updatedAt: new Date(),
  endereco: null,
};

const mockEmpresaService = {
  cadastrar: jest.fn(),
  buscarPorId: jest.fn(),
  atualizar: jest.fn(),
  deletar: jest.fn(),
};

const mockAuthGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

const mockRequest = {
  user: { sub: 'uuid-123' },
};

describe('EmpresaController', () => {
  let controller: EmpresaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmpresaController],
      providers: [
        {
          provide: EmpresaService,
          useValue: mockEmpresaService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<EmpresaController>(EmpresaController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('cadastrar', () => {
    it('deve cadastrar uma empresa com sucesso', async () => {
      const dto = {
        nome: 'Empresa do João',
        email: 'contato@joao.com',
        senha: '123456',
        cnpj: '12345678000190',
        telefone: '84999999999',
      };

      mockEmpresaService.cadastrar.mockResolvedValue(mockEmpresa);

      const resultado = await controller.cadastrar(dto);

      expect(resultado).toEqual(mockEmpresa);
      expect(mockEmpresaService.cadastrar).toHaveBeenCalledWith(dto);
    });
  });

  describe('perfil', () => {
    it('deve retornar o perfil da empresa logada', async () => {
      mockEmpresaService.buscarPorId.mockResolvedValue(mockEmpresa);

      const resultado = await controller.perfil(mockRequest);

      expect(resultado).toEqual(mockEmpresa);
      expect(mockEmpresaService.buscarPorId).toHaveBeenCalledWith('uuid-123');
    });
  });

  describe('atualizar', () => {
    it('deve atualizar o perfil da empresa logada', async () => {
      const dto = { nome: 'Novo Nome' };
      const empresaAtualizada = { ...mockEmpresa, nome: 'Novo Nome' };

      mockEmpresaService.atualizar.mockResolvedValue(empresaAtualizada);

      const resultado = await controller.atualizar(mockRequest, dto);

      expect(resultado).toEqual(empresaAtualizada);
      expect(mockEmpresaService.atualizar).toHaveBeenCalledWith(
        'uuid-123',
        dto,
      );
    });
  });

  describe('deletar', () => {
    it('deve deletar a empresa logada', async () => {
      mockEmpresaService.deletar.mockResolvedValue({
        message: 'Empresa deletada com sucesso',
      });

      const resultado = await controller.deletar(mockRequest);

      expect(resultado).toEqual({ message: 'Empresa deletada com sucesso' });
      expect(mockEmpresaService.deletar).toHaveBeenCalledWith('uuid-123');
    });
  });
});
