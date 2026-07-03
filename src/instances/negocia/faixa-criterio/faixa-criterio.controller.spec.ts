import { Test, TestingModule } from '@nestjs/testing';
import { FaixaCriterioController } from './faixa-criterio.controller';
import { FaixaCriterioService } from './faixa-criterio.service';
import { AuthGuard } from '../../../core/auth/auth.guard';
import type { JwtPayload } from '../../../core/auth/interfaces/jwt-payload.interface';
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
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
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

  describe('create', () => {
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

      const resultado = await controller.create(dto, mockJwtPayload);

      expect(resultado).toEqual(mockFaixa);
      expect(mockFaixaCriterioService.create).toHaveBeenCalledWith(dto, 'uuid-empresa-123');
    });

    it('deve propagar erro do service', async () => {
      mockFaixaCriterioService.create.mockRejectedValue(new Error('Sobreposição de faixas'));

      await expect(
        controller.create({} as CreateFaixaCriterioDto, mockJwtPayload),
      ).rejects.toThrow('Sobreposição de faixas');
    });
  });

  describe('findAll', () => {
    it('deve listar as faixas da empresa logada', async () => {
      const faixas = [mockFaixa];
      mockFaixaCriterioService.findAll.mockResolvedValue(faixas);

      const resultado = await controller.findAll(mockJwtPayload);

      expect(resultado).toEqual(faixas);
      expect(mockFaixaCriterioService.findAll).toHaveBeenCalledWith('uuid-empresa-123');
    });

    it('deve retornar lista vazia se empresa não tiver faixas', async () => {
      mockFaixaCriterioService.findAll.mockResolvedValue([]);

      const resultado = await controller.findAll(mockJwtPayload);

      expect(resultado).toEqual([]);
    });
  });

  describe('findById', () => {
    it('deve buscar uma faixa por id com empresaId do token', async () => {
      mockFaixaCriterioService.findById.mockResolvedValue(mockFaixa);

      const resultado = await controller.findById('uuid-faixa-123', mockJwtPayload);

      expect(resultado).toEqual(mockFaixa);
      expect(mockFaixaCriterioService.findById).toHaveBeenCalledWith('uuid-faixa-123', 'uuid-empresa-123');
    });

    it('deve propagar erro do service', async () => {
      mockFaixaCriterioService.findById.mockRejectedValue(new Error('Faixa não encontrada.'));

      await expect(
        controller.findById('uuid-inexistente', mockJwtPayload),
      ).rejects.toThrow('Faixa não encontrada.');
    });
  });

  describe('update', () => {
    it('deve atualizar uma faixa passando id, dto e empresaId do token', async () => {
      const dto: UpdateFaixaCriterioDto = { descontoMaximo: 20 };
      const faixaAtualizada = { ...mockFaixa, descontoMaximo: 20 };

      mockFaixaCriterioService.update.mockResolvedValue(faixaAtualizada);

      const resultado = await controller.update('uuid-faixa-123', dto, mockJwtPayload);

      expect(resultado).toEqual(faixaAtualizada);
      expect(mockFaixaCriterioService.update).toHaveBeenCalledWith(
        'uuid-faixa-123',
        dto,
        'uuid-empresa-123',
      );
    });

    it('deve propagar erro do service', async () => {
      mockFaixaCriterioService.update.mockRejectedValue(new Error('Faixa não encontrada'));

      await expect(
        controller.update('uuid-inexistente', {}, mockJwtPayload),
      ).rejects.toThrow('Faixa não encontrada');
    });
  });

  describe('remove', () => {
    it('deve deletar uma faixa passando id e empresaId do token', async () => {
      mockFaixaCriterioService.remove.mockResolvedValue(undefined);

      await controller.remove('uuid-faixa-123', mockJwtPayload);

      expect(mockFaixaCriterioService.remove).toHaveBeenCalledWith(
        'uuid-faixa-123',
        'uuid-empresa-123',
      );
    });

    it('deve propagar erro do service', async () => {
      mockFaixaCriterioService.remove.mockRejectedValue(new Error('Faixa não encontrada'));

      await expect(
        controller.remove('uuid-inexistente', mockJwtPayload),
      ).rejects.toThrow('Faixa não encontrada');
    });
  });
});
