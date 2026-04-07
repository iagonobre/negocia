import { Test, TestingModule } from '@nestjs/testing';
import { DevedorController } from './devedor.controller';
import { DevedorService } from './devedor.service';
import { AuthGuard } from 'src/auth/auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { StatusDevedor, OrigemDevedor, TipoPessoa } from 'src/generated/prisma/enums';
import { CreateDevedorDto } from './dto/create-devedor.dto';
import { UpdateDevedorDto } from './dto/update-devedor.dto';

const mockDevedor = {
  id: 'uuid-devedor-123',
  nome: 'João Inadimplente',
  email: 'joao@devedor.com',
  telefone: '84999999999',
  tipoPessoa: TipoPessoa.FISICA,
  cpf: '12345678900',
  cnpj: null,
  valorDivida: 1500.0,
  descricaoDivida: 'Fatura em atraso',
  vencimento: new Date('2024-01-31'),
  numeroParcelas: null,
  status: StatusDevedor.PENDENTE,
  origem: OrigemDevedor.API,
  tentativas: 0,
  ultimoContato: null,
  empresaId: 'uuid-empresa-123',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDevedorService = {
  listar: jest.fn(),
  buscar: jest.fn(),
  cadastrar: jest.fn(),
  atualizar: jest.fn(),
  deletar: jest.fn(),
  importarCsv: jest.fn(),
};

const mockAuthGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

const mockJwtPayload: JwtPayload = {
  sub: 'uuid-empresa-123',
  email: 'empresa@test.com',
};

describe('DevedorController', () => {
  let controller: DevedorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevedorController],
      providers: [
        {
          provide: DevedorService,
          useValue: mockDevedorService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<DevedorController>(DevedorController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listar', () => {
    it('deve listar todos os devedores da empresa', async () => {
      mockDevedorService.listar.mockResolvedValue([mockDevedor]);

      const resultado = await controller.listar(mockJwtPayload);

      expect(resultado).toEqual([mockDevedor]);
      expect(mockDevedorService.listar).toHaveBeenCalledWith('uuid-empresa-123');
    });

    it('deve propagar erro do service', async () => {
      mockDevedorService.listar.mockRejectedValue(new Error('Erro ao listar'));

      await expect(controller.listar(mockJwtPayload)).rejects.toThrow('Erro ao listar');
    });
  });

  describe('buscar', () => {
    it('deve buscar um devedor por id com empresaId do token', async () => {
      mockDevedorService.buscar.mockResolvedValue(mockDevedor);

      const resultado = await controller.buscar('uuid-devedor-123', mockJwtPayload);

      expect(resultado).toEqual(mockDevedor);
      expect(mockDevedorService.buscar).toHaveBeenCalledWith('uuid-devedor-123', 'uuid-empresa-123');
    });

    it('deve propagar erro do service', async () => {
      mockDevedorService.buscar.mockRejectedValue(new Error('Devedor não encontrado'));

      await expect(
        controller.buscar('uuid-inexistente', mockJwtPayload),
      ).rejects.toThrow('Devedor não encontrado');
    });
  });

  describe('cadastrar', () => {
    it('deve cadastrar um devedor e passar empresaId do token', async () => {
      const dto: CreateDevedorDto = {
        nome: 'João Inadimplente',
        email: 'joao@devedor.com',
        telefone: '84999999999',
        tipoPessoa: TipoPessoa.FISICA,
        cpf: '12345678900',
        valorDivida: 1500.0,
        descricaoDivida: 'Fatura em atraso',
        vencimento: new Date('2024-01-31'),
        status: StatusDevedor.PENDENTE,
        origem: OrigemDevedor.API,
        tentativas: 0,
        empresaId: 'uuid-empresa-123',
      };

      mockDevedorService.cadastrar.mockResolvedValue(mockDevedor);

      const resultado = await controller.cadastrar(mockJwtPayload, dto);

      expect(resultado).toEqual(mockDevedor);
      expect(mockDevedorService.cadastrar).toHaveBeenCalledWith(dto, 'uuid-empresa-123');
    });

    it('deve propagar erro do service', async () => {
      mockDevedorService.cadastrar.mockRejectedValue(new Error('Erro ao cadastrar'));

      await expect(
        controller.cadastrar(mockJwtPayload, {} as CreateDevedorDto),
      ).rejects.toThrow('Erro ao cadastrar');
    });
  });

  describe('atualizar', () => {
    it('deve atualizar um devedor com id e empresaId corretos', async () => {
      const dto: UpdateDevedorDto = { valorDivida: 2000.0 };
      const devedorAtualizado = { ...mockDevedor, valorDivida: 2000.0 };

      mockDevedorService.atualizar.mockResolvedValue(devedorAtualizado);

      const resultado = await controller.atualizar(
        'uuid-devedor-123',
        mockJwtPayload,
        dto,
      );

      expect(resultado).toEqual(devedorAtualizado);
      expect(mockDevedorService.atualizar).toHaveBeenCalledWith(
        'uuid-devedor-123',
        'uuid-empresa-123',
        dto,
      );
    });

    it('deve propagar erro do service', async () => {
      mockDevedorService.atualizar.mockRejectedValue(new Error('Devedor não encontrado'));

      await expect(
        controller.atualizar('uuid-inexistente', mockJwtPayload, {}),
      ).rejects.toThrow('Devedor não encontrado');
    });
  });

  describe('deletar', () => {
    it('deve deletar um devedor passando id e empresaId do token', async () => {
      mockDevedorService.deletar.mockResolvedValue(undefined);

      await controller.deletar('uuid-devedor-123', mockJwtPayload);

      expect(mockDevedorService.deletar).toHaveBeenCalledWith('uuid-devedor-123', 'uuid-empresa-123');
    });

    it('deve propagar erro do service', async () => {
      mockDevedorService.deletar.mockRejectedValue(new Error('Devedor não encontrado'));

      await expect(
        controller.deletar('uuid-inexistente', mockJwtPayload),
      ).rejects.toThrow('Devedor não encontrado');
    });
  });

  describe('importar', () => {
    it('deve importar arquivo CSV e retornar contagem de importados', async () => {
      const mockFile = {
        buffer: Buffer.from('nome,email\nJoão,joao@test.com'),
        mimetype: 'text/csv',
        originalname: 'devedores.csv',
      } as Express.Multer.File;

      const mockResultado = {
        mensagem: 'Importação concluída com sucesso',
        importados: 1,
      };

      mockDevedorService.importarCsv.mockResolvedValue(mockResultado);

      const resultado = await controller.importar(mockFile, mockJwtPayload);

      expect(resultado).toEqual(mockResultado);
      expect(mockDevedorService.importarCsv).toHaveBeenCalledWith(
        mockFile,
        'uuid-empresa-123',
      );
    });

    it('deve propagar erro do service durante importação', async () => {
      const mockFile = {
        buffer: Buffer.from('csv inválido'),
        mimetype: 'text/csv',
        originalname: 'devedores.csv',
      } as Express.Multer.File;

      mockDevedorService.importarCsv.mockRejectedValue(new Error('Falha na importação'));

      await expect(
        controller.importar(mockFile, mockJwtPayload),
      ).rejects.toThrow('Falha na importação');
    });
  });
});
