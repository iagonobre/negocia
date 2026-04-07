import { Test, TestingModule } from '@nestjs/testing';
import { FaixaCriterioController } from './faixa-criterio.controller';
import { FaixaCriterioService } from './faixa-criterio.service';
import { AuthGuard } from '../auth/auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateFaixaCriterioDto } from './dto/create-faixa-criterio.dto';
import { UpdateFaixaCriterioDto } from './dto/update-faixa-criterio.dto';

const mockFaixa = {
  id: 'uuid-faixa-123',
  descricao: 'Dívidas pequenas',
  valorMinimo: 0,
  valorMaximo: 500,
  prazoMaximoDias: 30,
  parcelasMaximas: 3,
  descontoMaximo: 10,
  tomComunicacao: 'informal',
  mensagemInicial: 'Olá, tudo bem?',
  empresaId: 'uuid-empresa-123',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockFaixaCriterioService = {
  create: jest.fn(),
  listarPorEmpresa: jest.fn(),
  buscar: jest.fn(),
  atualizar: jest.fn(),
  deletar: jest.fn(),
};

const mockAuthGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

const mockJwtPayload: JwtPayload = {
  sub: 'uuid-empresa-123',
  email: 'empresa@test.com',
};

describe('FaixaCriterioController', () => {
  let controller: FaixaCriterioController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FaixaCriterioController],
      providers: [
        {
          provide: FaixaCriterioService,
          useValue: mockFaixaCriterioService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<FaixaCriterioController>(FaixaCriterioController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('criar', () => {
    it('deve criar uma faixa passando empresaId do token', async () => {
      const dto: CreateFaixaCriterioDto = {
        descricao: 'Dívidas pequenas',
        valorMinimo: 0,
        valorMaximo: 500,
        prazoMaximoDias: 30,
        parcelasMaximas: 3,
        descontoMaximo: 10,
        tomComunicacao: 'informal',
      };

      mockFaixaCriterioService.create.mockResolvedValue(mockFaixa);

      const resultado = await controller.criar(mockJwtPayload, dto);

      expect(resultado).toEqual(mockFaixa);
      expect(mockFaixaCriterioService.create).toHaveBeenCalledWith(dto, 'uuid-empresa-123');
    });

    it('deve propagar erro do service', async () => {
      mockFaixaCriterioService.create.mockRejectedValue(new Error('Sobreposição de faixas'));

      await expect(
        controller.criar(mockJwtPayload, {} as CreateFaixaCriterioDto),
      ).rejects.toThrow('Sobreposição de faixas');
    });
  });

  describe('listar', () => {
    it('deve listar as faixas da empresa logada', async () => {
      const faixas = [mockFaixa];
      mockFaixaCriterioService.listarPorEmpresa.mockResolvedValue(faixas);

      const resultado = await controller.listar(mockJwtPayload);

      expect(resultado).toEqual(faixas);
      expect(mockFaixaCriterioService.listarPorEmpresa).toHaveBeenCalledWith('uuid-empresa-123');
    });

    it('deve retornar lista vazia se empresa não tiver faixas', async () => {
      mockFaixaCriterioService.listarPorEmpresa.mockResolvedValue([]);

      const resultado = await controller.listar(mockJwtPayload);

      expect(resultado).toEqual([]);
    });
  });

  describe('buscar', () => {
    it('deve buscar uma faixa por id com empresaId do token', async () => {
      mockFaixaCriterioService.buscar.mockResolvedValue(mockFaixa);

      const resultado = await controller.buscar('uuid-faixa-123', mockJwtPayload);

      expect(resultado).toEqual(mockFaixa);
      expect(mockFaixaCriterioService.buscar).toHaveBeenCalledWith('uuid-faixa-123', 'uuid-empresa-123');
    });

    it('deve propagar erro do service', async () => {
      mockFaixaCriterioService.buscar.mockRejectedValue(new Error('Faixa não encontrada.'));

      await expect(
        controller.buscar('uuid-inexistente', mockJwtPayload),
      ).rejects.toThrow('Faixa não encontrada.');
    });
  });

  describe('atualizar', () => {
    it('deve atualizar uma faixa passando id e empresaId do token', async () => {
      const dto: UpdateFaixaCriterioDto = { descontoMaximo: 20 };
      const faixaAtualizada = { ...mockFaixa, descontoMaximo: 20 };

      mockFaixaCriterioService.atualizar.mockResolvedValue(faixaAtualizada);

      const resultado = await controller.atualizar('uuid-faixa-123', mockJwtPayload, dto);

      expect(resultado).toEqual(faixaAtualizada);
      expect(mockFaixaCriterioService.atualizar).toHaveBeenCalledWith(
        'uuid-faixa-123',
        'uuid-empresa-123',
        dto,
      );
    });

    it('deve propagar erro do service', async () => {
      mockFaixaCriterioService.atualizar.mockRejectedValue(new Error('Faixa não encontrada'));

      await expect(
        controller.atualizar('uuid-inexistente', mockJwtPayload, {}),
      ).rejects.toThrow('Faixa não encontrada');
    });
  });

  describe('deletar', () => {
    it('deve deletar uma faixa passando id e empresaId do token', async () => {
      mockFaixaCriterioService.deletar.mockResolvedValue(undefined);

      await controller.deletar('uuid-faixa-123', mockJwtPayload);

      expect(mockFaixaCriterioService.deletar).toHaveBeenCalledWith(
        'uuid-faixa-123',
        'uuid-empresa-123',
      );
    });

    it('deve propagar erro do service', async () => {
      mockFaixaCriterioService.deletar.mockRejectedValue(new Error('Faixa não encontrada'));

      await expect(
        controller.deletar('uuid-inexistente', mockJwtPayload),
      ).rejects.toThrow('Faixa não encontrada');
    });
  });
});
