import { Test, TestingModule } from '@nestjs/testing';
import { DevedorService } from './devedor.service';
import { DevedorRepository } from './devedor.repository';
import { StatusDevedor, OrigemDevedor, TipoPessoa } from 'src/generated/prisma/enums';
import { CreateDevedorDto } from './dto/create-devedor.dto';

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

const mockRepository = {
  create: jest.fn(),
  update: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
  upsertMany: jest.fn(),
};

describe('DevedorService', () => {
  let service: DevedorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevedorService,
        {
          provide: DevedorRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DevedorService>(DevedorService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cadastrar', () => {
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

    it('deve cadastrar um devedor com sucesso', async () => {
      mockRepository.create.mockResolvedValue(mockDevedor);

      const resultado = await service.cadastrar(dto, 'uuid-empresa-123');

      expect(resultado).toEqual(mockDevedor);
      expect(mockRepository.create).toHaveBeenCalledTimes(1);
    });

    it('deve conectar o devedor à empresa pelo empresaId do token', async () => {
      mockRepository.create.mockResolvedValue(mockDevedor);

      await service.cadastrar(dto, 'uuid-empresa-123');

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          empresa: { connect: { id: 'uuid-empresa-123' } },
        }),
      );
    });

    it('deve propagar erro do repository', async () => {
      mockRepository.create.mockRejectedValue(new Error('Erro no banco'));

      await expect(service.cadastrar(dto, 'uuid-empresa-123')).rejects.toThrow(
        'Erro no banco',
      );
    });
  });

  describe('listar', () => {
    it('deve retornar todos os devedores da empresa', async () => {
      mockRepository.findAll.mockResolvedValue([mockDevedor]);

      const resultado = await service.listar('uuid-empresa-123');

      expect(resultado).toEqual([mockDevedor]);
      expect(mockRepository.findAll).toHaveBeenCalledWith('uuid-empresa-123');
    });

    it('deve retornar lista vazia quando não há devedores', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      const resultado = await service.listar('uuid-empresa-123');

      expect(resultado).toEqual([]);
    });
  });

  describe('buscar', () => {
    it('deve retornar o devedor quando encontrado', async () => {
      mockRepository.findOne.mockResolvedValue(mockDevedor);

      const resultado = await service.buscar('uuid-devedor-123', 'uuid-empresa-123');

      expect(resultado).toEqual(mockDevedor);
      expect(mockRepository.findOne).toHaveBeenCalledWith('uuid-devedor-123', 'uuid-empresa-123');
    });

    it('deve lançar NotFoundException quando devedor não existe', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.buscar('uuid-inexistente', 'uuid-empresa-123'),
      ).rejects.toThrow('Devedor não encontrado');
    });
  });

  describe('atualizar', () => {
    it('deve atualizar um devedor com sucesso', async () => {
      const dto = { valorDivida: 2000.0 };
      const devedorAtualizado = { ...mockDevedor, valorDivida: 2000.0 };

      mockRepository.findOne.mockResolvedValue(mockDevedor);
      mockRepository.update.mockResolvedValue(devedorAtualizado);

      const resultado = await service.atualizar(
        'uuid-devedor-123',
        'uuid-empresa-123',
        dto,
      );

      expect(resultado).toEqual(devedorAtualizado);
    });

    it('deve filtrar o update por id e empresaId para garantir isolamento', async () => {
      const dto = { status: StatusDevedor.ACORDADO };
      mockRepository.findOne.mockResolvedValue(mockDevedor);
      mockRepository.update.mockResolvedValue({ ...mockDevedor, ...dto });

      await service.atualizar('uuid-devedor-123', 'uuid-empresa-123', dto);

      expect(mockRepository.update).toHaveBeenCalledWith({
        where: {
          id: 'uuid-devedor-123',
          empresaId: 'uuid-empresa-123',
        },
        data: dto,
      });
    });

    it('deve lançar NotFoundException se devedor não existir', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.atualizar('uuid-inexistente', 'uuid-empresa-123', {}),
      ).rejects.toThrow('Devedor não encontrado');

      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deletar', () => {
    it('deve deletar um devedor com sucesso', async () => {
      mockRepository.findOne.mockResolvedValue(mockDevedor);
      mockRepository.delete.mockResolvedValue(undefined);

      await service.deletar('uuid-devedor-123', 'uuid-empresa-123');

      expect(mockRepository.delete).toHaveBeenCalledWith('uuid-devedor-123', 'uuid-empresa-123');
    });

    it('deve lançar NotFoundException se devedor não existir', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deletar('uuid-inexistente', 'uuid-empresa-123'),
      ).rejects.toThrow('Devedor não encontrado');

      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('importarCsv', () => {
    function criarCsvBuffer(linhas: string[]): Express.Multer.File {
      const header =
        'nome,email,telefone,tipoPessoa,cpf,cnpj,valorDivida,descricaoDivida,vencimento,numeroParcelas,status,origem,tentativas,ultimoContato';
      const conteudo = [header, ...linhas].join('\n');
      return {
        buffer: Buffer.from(conteudo),
        mimetype: 'text/csv',
        originalname: 'devedores.csv',
      } as Express.Multer.File;
    }

    it('deve importar um devedor com sucesso e retornar contagem', async () => {
      const file = criarCsvBuffer([
        'João Inadimplente,joao@devedor.com,84999999999,FISICA,12345678900,,1500.00,Fatura em atraso,2024-01-31,,PENDENTE,PLANILHA,0,',
      ]);

      mockRepository.upsertMany.mockResolvedValue([mockDevedor]);

      const resultado = await service.importarCsv(file, 'uuid-empresa-123');

      expect(resultado).toEqual({
        mensagem: 'Importação concluída com sucesso',
        importados: 1,
      });
      expect(mockRepository.upsertMany).toHaveBeenCalledTimes(1);
    });

    it('deve converter valorDivida para float', async () => {
      const file = criarCsvBuffer([
        'Maria Silva,maria@devedor.com,84988888888,FISICA,98765432100,,750.50,,2024-06-30,,PENDENTE,PLANILHA,0,',
      ]);

      mockRepository.upsertMany.mockResolvedValue([]);

      await service.importarCsv(file, 'uuid-empresa-123');

      expect(mockRepository.upsertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ valorDivida: 750.5 }),
        ]),
        'uuid-empresa-123',
      );
    });

    it('deve converter numeroParcelas e tentativas para inteiros', async () => {
      const file = criarCsvBuffer([
        'Maria Silva,maria@devedor.com,84988888888,FISICA,98765432100,,750.50,,2024-06-30,3,EM_NEGOCIACAO,PLANILHA,2,',
      ]);

      mockRepository.upsertMany.mockResolvedValue([]);

      await service.importarCsv(file, 'uuid-empresa-123');

      expect(mockRepository.upsertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ numeroParcelas: 3, tentativas: 2 }),
        ]),
        'uuid-empresa-123',
      );
    });

    it('deve converter campos opcionais vazios para null', async () => {
      const file = criarCsvBuffer([
        'José Silva,jose@devedor.com,84977777777,FISICA,,,300.00,,2024-03-15,,PENDENTE,PLANILHA,0,',
      ]);

      mockRepository.upsertMany.mockResolvedValue([]);

      await service.importarCsv(file, 'uuid-empresa-123');

      expect(mockRepository.upsertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            cpf: null,
            cnpj: null,
            descricaoDivida: null,
            numeroParcelas: null,
            ultimoContato: null,
          }),
        ]),
        'uuid-empresa-123',
      );
    });

    it('deve converter ultimoContato para Date quando preenchido e null quando vazio', async () => {
      const file = criarCsvBuffer([
        'João Silva,joao@devedor.com,84911111111,FISICA,11111111100,,100.00,,2024-01-01,,PENDENTE,PLANILHA,0,2024-03-10',
        'Maria Silva,maria@devedor.com,84922222222,FISICA,22222222200,,200.00,,2024-02-01,,PENDENTE,PLANILHA,0,',
      ]);

      mockRepository.upsertMany.mockResolvedValue([]);

      await service.importarCsv(file, 'uuid-empresa-123');

      expect(mockRepository.upsertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ ultimoContato: new Date('2024-03-10') }),
          expect.objectContaining({ ultimoContato: null }),
        ]),
        'uuid-empresa-123',
      );
    });

    it('deve converter tentativas para 0 quando vazio', async () => {
      const file = criarCsvBuffer([
        'Ana Costa,ana@devedor.com,84966666666,FISICA,11122233344,,500.00,,2024-05-01,,,PLANILHA,,',
      ]);

      mockRepository.upsertMany.mockResolvedValue([]);

      await service.importarCsv(file, 'uuid-empresa-123');

      expect(mockRepository.upsertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ tentativas: 0 }),
        ]),
        'uuid-empresa-123',
      );
    });

    it('deve importar múltiplos devedores e retornar contagem correta', async () => {
      const file = criarCsvBuffer([
        'Devedor 1,d1@test.com,84911111111,FISICA,11111111100,,100.00,,2024-01-01,,PENDENTE,PLANILHA,0,',
        'Devedor 2,d2@test.com,84922222222,FISICA,22222222200,,200.00,,2024-02-01,,PENDENTE,PLANILHA,0,',
        'Devedor 3,d3@test.com,84933333333,FISICA,33333333300,,300.00,,2024-03-01,,PENDENTE,PLANILHA,0,',
      ]);

      mockRepository.upsertMany.mockResolvedValue([]);

      const resultado = await service.importarCsv(file, 'uuid-empresa-123');

      expect(resultado).toEqual({
        mensagem: 'Importação concluída com sucesso',
        importados: 3,
      });
    });

    it('deve passar o empresaId correto para o upsertMany', async () => {
      const file = criarCsvBuffer([
        'Devedor 1,d1@test.com,84911111111,FISICA,11111111100,,100.00,,2024-01-01,,PENDENTE,PLANILHA,0,',
      ]);

      mockRepository.upsertMany.mockResolvedValue([]);

      await service.importarCsv(file, 'uuid-empresa-456');

      expect(mockRepository.upsertMany).toHaveBeenCalledWith(
        expect.any(Array),
        'uuid-empresa-456',
      );
    });

    it('deve propagar erro do repository durante upsert', async () => {
      const file = criarCsvBuffer([
        'Devedor 1,d1@test.com,84911111111,FISICA,11111111100,,100.00,,2024-01-01,,PENDENTE,PLANILHA,0,',
      ]);

      mockRepository.upsertMany.mockRejectedValue(new Error('Falha na transação'));

      await expect(
        service.importarCsv(file, 'uuid-empresa-123'),
      ).rejects.toThrow('Falha na transação');
    });
  });
});
