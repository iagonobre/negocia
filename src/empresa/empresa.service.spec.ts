import { Test, TestingModule } from '@nestjs/testing';
import { EmpresaService } from './empresa.service';
import { EmpresaRepository } from './empresa.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';

const mockEndereco = {
  id: 'uuid-endereco-123',
  cep: '59000-000',
  logradouro: 'Rua das Flores',
  numero: '100',
  complemento: null,
  bairro: 'Centro',
  cidade: 'Natal',
  estado: 'RN',
  empresaId: 'uuid-123',
};

const mockEmpresa = {
  id: 'uuid-123',
  nome: 'Empresa do João',
  email: 'contato@joao.com',
  cnpj: '12345678000190',
  telefone: '84999999999',
  createdAt: new Date(),
  updatedAt: new Date(),
  endereco: mockEndereco,
};

const mockRepository = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByCnpj: jest.fn(),
  findByEmailExcludingId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('EmpresaService', () => {
  let service: EmpresaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmpresaService,
        {
          provide: EmpresaRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<EmpresaService>(EmpresaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cadastrar', () => {
    const dto = {
      nome: 'Empresa do João',
      email: 'contato@joao.com',
      senha: '123456',
      cnpj: '12345678000190',
      telefone: '84999999999',
      endereco: {
        cep: '59000-000',
        logradouro: 'Rua das Flores',
        numero: '100',
        bairro: 'Centro',
        cidade: 'Natal',
        estado: 'RN',
      },
    };

    it('deve cadastrar uma empresa com sucesso', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.findByCnpj.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({
        ...mockEmpresa,
        senha: 'hash',
      });

      const resultado = await service.cadastrar(dto);

      expect(resultado).not.toHaveProperty('senha');
      expect(resultado.email).toBe(dto.email);
      expect(mockRepository.create).toHaveBeenCalledTimes(1);
    });

    it('deve lançar ConflictException se email já cadastrado', async () => {
      mockRepository.findByEmail.mockResolvedValue(mockEmpresa);

      await expect(service.cadastrar(dto)).rejects.toThrow(ConflictException);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('deve lançar ConflictException se CNPJ já cadastrado', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.findByCnpj.mockResolvedValue(mockEmpresa);

      await expect(service.cadastrar(dto)).rejects.toThrow(ConflictException);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('buscarPorId', () => {
    it('deve retornar a empresa se encontrada', async () => {
      mockRepository.findById.mockResolvedValue(mockEmpresa);

      const resultado = await service.buscarPorId('uuid-123');

      expect(resultado).toEqual(mockEmpresa);
    });

    it('deve lançar NotFoundException se empresa não encontrada', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.buscarPorId('uuid-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('atualizar', () => {
    it('deve atualizar a empresa com sucesso', async () => {
      mockRepository.findById.mockResolvedValue(mockEmpresa);
      mockRepository.findByEmailExcludingId.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue({
        ...mockEmpresa,
        nome: 'Novo Nome',
        senha: 'hash',
      });

      const resultado = await service.atualizar('uuid-123', {
        nome: 'Novo Nome',
      });

      expect(resultado).not.toHaveProperty('senha');
      expect(mockRepository.update).toHaveBeenCalledTimes(1);
    });

    it('deve lançar ConflictException se email já usado por outra empresa', async () => {
      mockRepository.findById.mockResolvedValue(mockEmpresa);
      mockRepository.findByEmailExcludingId.mockResolvedValue(mockEmpresa);

      await expect(
        service.atualizar('uuid-123', { email: 'outro@email.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deletar', () => {
    it('deve deletar a empresa com sucesso', async () => {
      mockRepository.findById.mockResolvedValue(mockEmpresa);
      mockRepository.delete.mockResolvedValue(mockEmpresa);

      const resultado = await service.deletar('uuid-123');

      expect(resultado).toEqual({ message: 'Empresa deletada com sucesso' });
      expect(mockRepository.delete).toHaveBeenCalledWith('uuid-123');
    });

    it('deve lançar NotFoundException se empresa não encontrada', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.deletar('uuid-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
