import { Test, TestingModule } from '@nestjs/testing';
import { FaixaCriterioService } from './faixa-criterio.service';
import { FaixaCriterioRepository } from './faixa-criterio.repository';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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

const mockRepository = {
  create: jest.fn(),
  listarPorEmpresa: jest.fn(),
  buscarPorId: jest.fn(),
  buscarSobrepostas: jest.fn(),
  atualizar: jest.fn(),
  deletar: jest.fn(),
};

describe('FaixaCriterioService', () => {
  let service: FaixaCriterioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaixaCriterioService,
        {
          provide: FaixaCriterioRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<FaixaCriterioService>(FaixaCriterioService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateFaixaCriterioDto = {
      descricao: 'Dívidas pequenas',
      valorMinimo: 0,
      valorMaximo: 500,
      prazoMaximoDias: 30,
      parcelasMaximas: 3,
      descontoMaximo: 10,
      tomComunicacao: 'informal',
    };

    it('deve criar uma faixa com sucesso quando é a primeira da empresa', async () => {
      mockRepository.buscarSobrepostas.mockResolvedValue([]);
      mockRepository.listarPorEmpresa.mockResolvedValue([]);
      mockRepository.create.mockResolvedValue(mockFaixa);

      const resultado = await service.create(dto, 'uuid-empresa-123');

      expect(resultado).toEqual(mockFaixa);
      expect(mockRepository.create).toHaveBeenCalledWith(dto, 'uuid-empresa-123');
    });

    it('deve criar uma faixa contígua ao final de uma existente', async () => {
      const faixaExistente = { ...mockFaixa, valorMinimo: 0, valorMaximo: 500 };
      const novaDto = { ...dto, valorMinimo: 500, valorMaximo: 1000 };

      mockRepository.buscarSobrepostas.mockResolvedValue([]);
      mockRepository.listarPorEmpresa.mockResolvedValue([faixaExistente]);
      mockRepository.create.mockResolvedValue({ ...mockFaixa, ...novaDto });

      const resultado = await service.create(novaDto, 'uuid-empresa-123');

      expect(resultado).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalledTimes(1);
    });

    it('deve criar uma faixa contígua ao início de uma existente', async () => {
      const faixaExistente = { ...mockFaixa, valorMinimo: 500, valorMaximo: 1000 };
      const novaDto = { ...dto, valorMinimo: 0, valorMaximo: 500 };

      mockRepository.buscarSobrepostas.mockResolvedValue([]);
      mockRepository.listarPorEmpresa.mockResolvedValue([faixaExistente]);
      mockRepository.create.mockResolvedValue({ ...mockFaixa, ...novaDto });

      const resultado = await service.create(novaDto, 'uuid-empresa-123');

      expect(resultado).toBeDefined();
    });

    it('deve lançar BadRequestException se valorMinimo >= valorMaximo (igual)', async () => {
      await expect(
        service.create({ ...dto, valorMinimo: 500, valorMaximo: 500 }, 'uuid-empresa-123'),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException se valorMinimo > valorMaximo', async () => {
      await expect(
        service.create({ ...dto, valorMinimo: 600, valorMaximo: 500 }, 'uuid-empresa-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException se prazoMaximoDias <= 0', async () => {
      await expect(
        service.create({ ...dto, prazoMaximoDias: 0 }, 'uuid-empresa-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException se parcelasMaximas <= 0', async () => {
      await expect(
        service.create({ ...dto, parcelasMaximas: 0 }, 'uuid-empresa-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException se descontoMaximo < 0', async () => {
      await expect(
        service.create({ ...dto, descontoMaximo: -1 }, 'uuid-empresa-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException se descontoMaximo > 100', async () => {
      await expect(
        service.create({ ...dto, descontoMaximo: 101 }, 'uuid-empresa-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException se houver sobreposição com faixa existente', async () => {
      mockRepository.buscarSobrepostas.mockResolvedValue([mockFaixa]);

      await expect(service.create(dto, 'uuid-empresa-123')).rejects.toThrow(BadRequestException);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException se criar lacuna entre faixas', async () => {
      const faixaExistente = { ...mockFaixa, valorMinimo: 0, valorMaximo: 500 };
      const novaDto = { ...dto, valorMinimo: 1000, valorMaximo: 2000 };

      mockRepository.buscarSobrepostas.mockResolvedValue([]);
      mockRepository.listarPorEmpresa.mockResolvedValue([faixaExistente]);

      await expect(service.create(novaDto, 'uuid-empresa-123')).rejects.toThrow(BadRequestException);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('listarPorEmpresa', () => {
    it('deve retornar as faixas da empresa', async () => {
      const faixas = [mockFaixa];
      mockRepository.listarPorEmpresa.mockResolvedValue(faixas);

      const resultado = await service.listarPorEmpresa('uuid-empresa-123');

      expect(resultado).toEqual(faixas);
      expect(mockRepository.listarPorEmpresa).toHaveBeenCalledWith('uuid-empresa-123');
    });

    it('deve retornar lista vazia se empresa não tiver faixas', async () => {
      mockRepository.listarPorEmpresa.mockResolvedValue([]);

      const resultado = await service.listarPorEmpresa('uuid-empresa-123');

      expect(resultado).toEqual([]);
    });
  });

  describe('atualizar', () => {
    it('deve atualizar uma faixa com sucesso', async () => {
      const dto: UpdateFaixaCriterioDto = { descontoMaximo: 20 };
      const faixaAtualizada = { ...mockFaixa, descontoMaximo: 20 };

      mockRepository.buscarPorId.mockResolvedValue(mockFaixa);
      mockRepository.buscarSobrepostas.mockResolvedValue([]);
      mockRepository.listarPorEmpresa.mockResolvedValue([mockFaixa]);
      mockRepository.atualizar.mockResolvedValue(faixaAtualizada);

      const resultado = await service.atualizar('uuid-faixa-123', 'uuid-empresa-123', dto);

      expect(resultado).toEqual(faixaAtualizada);
      expect(mockRepository.atualizar).toHaveBeenCalledWith('uuid-faixa-123', dto);
    });

    it('deve lançar NotFoundException se faixa não existir', async () => {
      mockRepository.buscarPorId.mockResolvedValue(null);

      await expect(
        service.atualizar('uuid-inexistente', 'uuid-empresa-123', {}),
      ).rejects.toThrow(NotFoundException);

      expect(mockRepository.atualizar).not.toHaveBeenCalled();
    });

    it('deve lançar ForbiddenException se faixa pertencer a outra empresa', async () => {
      const faixaDeOutraEmpresa = { ...mockFaixa, empresaId: 'uuid-outra-empresa' };
      mockRepository.buscarPorId.mockResolvedValue(faixaDeOutraEmpresa);

      await expect(
        service.atualizar('uuid-faixa-123', 'uuid-empresa-123', { descontoMaximo: 20 }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRepository.atualizar).not.toHaveBeenCalled();
    });

    it('deve usar valores existentes para campos não informados na validação', async () => {
      const dto: UpdateFaixaCriterioDto = { descontoMaximo: 20 };

      mockRepository.buscarPorId.mockResolvedValue(mockFaixa);
      mockRepository.buscarSobrepostas.mockResolvedValue([]);
      mockRepository.listarPorEmpresa.mockResolvedValue([mockFaixa]);
      mockRepository.atualizar.mockResolvedValue({ ...mockFaixa, descontoMaximo: 20 });

      await service.atualizar('uuid-faixa-123', 'uuid-empresa-123', dto);

      expect(mockRepository.buscarSobrepostas).toHaveBeenCalledWith(
        'uuid-empresa-123',
        mockFaixa.valorMinimo,
        mockFaixa.valorMaximo,
        'uuid-faixa-123',
      );
    });

    it('deve lançar BadRequestException ao atualizar com valorMinimo >= valorMaximo', async () => {
      mockRepository.buscarPorId.mockResolvedValue(mockFaixa);

      await expect(
        service.atualizar('uuid-faixa-123', 'uuid-empresa-123', {
          valorMinimo: 500,
          valorMaximo: 500,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException ao atualizar gerando sobreposição', async () => {
      const outraFaixa = { ...mockFaixa, id: 'uuid-faixa-456', valorMinimo: 500, valorMaximo: 1000 };

      mockRepository.buscarPorId.mockResolvedValue(mockFaixa);
      mockRepository.buscarSobrepostas.mockResolvedValue([outraFaixa]);

      await expect(
        service.atualizar('uuid-faixa-123', 'uuid-empresa-123', { valorMaximo: 800 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deletar', () => {
    it('deve deletar uma faixa com sucesso', async () => {
      mockRepository.buscarPorId.mockResolvedValue(mockFaixa);
      mockRepository.deletar.mockResolvedValue(undefined);

      await service.deletar('uuid-faixa-123', 'uuid-empresa-123');

      expect(mockRepository.deletar).toHaveBeenCalledWith('uuid-faixa-123');
    });

    it('deve lançar NotFoundException se faixa não existir', async () => {
      mockRepository.buscarPorId.mockResolvedValue(null);

      await expect(
        service.deletar('uuid-inexistente', 'uuid-empresa-123'),
      ).rejects.toThrow(NotFoundException);

      expect(mockRepository.deletar).not.toHaveBeenCalled();
    });

    it('deve lançar ForbiddenException se faixa pertencer a outra empresa', async () => {
      const faixaDeOutraEmpresa = { ...mockFaixa, empresaId: 'uuid-outra-empresa' };
      mockRepository.buscarPorId.mockResolvedValue(faixaDeOutraEmpresa);

      await expect(
        service.deletar('uuid-faixa-123', 'uuid-empresa-123'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRepository.deletar).not.toHaveBeenCalled();
    });
  });
});
