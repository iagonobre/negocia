import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const prisma = new PrismaClient({ adapter });

const SENHA_PADRAO = 'demo12345';
const TELEFONE_TESTE = '558496505083';

async function seedNegocia() {
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);

  const empresa = await prisma.empresa.upsert({
    where: { email: 'negocia@demo.com' },
    update: {},
    create: {
      nome: 'Negocia Cobranças Demo',
      email: 'negocia@demo.com',
      senha: senhaHash,
      cnpj: '11222333000181',
      telefone: '5511999990001',
      endereco: {
        create: {
          cep: '01001-000',
          logradouro: 'Praça da Sé',
          numero: '100',
          bairro: 'Sé',
          cidade: 'São Paulo',
          estado: 'SP',
        },
      },
    },
  });

  // reseta dados filhos para manter o seed idempotente
  await prisma.devedor.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.faixaCriterio.deleteMany({ where: { empresaId: empresa.id } });

  await prisma.faixaCriterio.createMany({
    data: [
      {
        empresaId: empresa.id,
        descricao: 'Dívidas pequenas',
        valorMinimo: 0,
        valorMaximo: 1000,
        prazoMaximoDias: 30,
        parcelasMaximas: 3,
        descontoMaximo: 20,
        tomComunicacao: 'informal e direto',
        mensagemInicial:
          'Olá! Notamos uma pendência em aberto e gostaríamos de resolver isso com você. Podemos conversar sobre as opções?',
      },
      {
        empresaId: empresa.id,
        descricao: 'Dívidas médias',
        valorMinimo: 1000.01,
        valorMaximo: 5000,
        prazoMaximoDias: 60,
        parcelasMaximas: 6,
        descontoMaximo: 15,
        tomComunicacao: 'cordial e profissional',
        mensagemInicial:
          'Olá! Temos uma proposta especial de negociação para sua dívida. Vamos conversar?',
      },
    ],
  });

  const hoje = new Date();
  const diasAtras = (dias: number) => new Date(hoje.getTime() - dias * 86400000);

  await prisma.devedor.createMany({
    data: [
      {
        empresaId: empresa.id,
        nome: 'Carlos Silva',
        telefone: TELEFONE_TESTE,
        tipoPessoa: 'FISICA',
        cpf: '12345678900',
        valorDivida: 450.0,
        descricaoDivida: 'Mensalidade em atraso',
        vencimento: diasAtras(20),
        status: 'PENDENTE',
        origem: 'API',
      },
      {
        empresaId: empresa.id,
        nome: 'Comércio Souza Ltda',
        telefone: '5511988880002',
        tipoPessoa: 'JURIDICA',
        cnpj: '22333444000155',
        valorDivida: 2300.0,
        descricaoDivida: 'Fatura de serviços prestados',
        vencimento: diasAtras(45),
        status: 'EM_NEGOCIACAO',
        origem: 'API',
        tentativas: 2,
      },
      {
        empresaId: empresa.id,
        nome: 'Fernanda Souza',
        telefone: '5511988880003',
        tipoPessoa: 'FISICA',
        cpf: '98765432100',
        valorDivida: 800.0,
        descricaoDivida: 'Compra parcelada',
        vencimento: diasAtras(10),
        status: 'ACORDADO',
        origem: 'PLANILHA',
      },
      {
        empresaId: empresa.id,
        nome: 'Roberto Farias',
        telefone: TELEFONE_TESTE,
        tipoPessoa: 'FISICA',
        cpf: '32165498700',
        valorDivida: 320.0,
        descricaoDivida: 'Anuidade em atraso',
        vencimento: diasAtras(5),
        status: 'PENDENTE',
        origem: 'API',
      },
      {
        empresaId: empresa.id,
        nome: 'Distribuidora Alvorada Ltda',
        telefone: TELEFONE_TESTE,
        tipoPessoa: 'JURIDICA',
        cnpj: '55666777000188',
        valorDivida: 3800.0,
        descricaoDivida: 'Nota fiscal em aberto',
        vencimento: diasAtras(15),
        status: 'PENDENTE',
        origem: 'PLANILHA',
      },
      {
        empresaId: empresa.id,
        nome: 'Juliana Ramos',
        telefone: TELEFONE_TESTE,
        tipoPessoa: 'FISICA',
        cpf: '65498732100',
        valorDivida: 950.0,
        descricaoDivida: 'Parcelamento não concluído',
        vencimento: diasAtras(2),
        status: 'PENDENTE',
        origem: 'API',
      },
    ],
  });

  return empresa;
}

async function seedSaude() {
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);

  const empresa = await prisma.empresa.upsert({
    where: { email: 'saude@demo.com' },
    update: {},
    create: {
      nome: 'Clínica Vida Saúde Demo',
      email: 'saude@demo.com',
      senha: senhaHash,
      cnpj: '33444555000122',
      telefone: '5521999990002',
      endereco: {
        create: {
          cep: '22041-011',
          logradouro: 'Av. Atlântica',
          numero: '500',
          bairro: 'Copacabana',
          cidade: 'Rio de Janeiro',
          estado: 'RJ',
        },
      },
    },
  });

  await prisma.paciente.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.configRetorno.deleteMany({ where: { empresaId: empresa.id } });

  const retornoRotina = await prisma.configRetorno.create({
    data: {
      empresaId: empresa.id,
      descricao: 'Retorno pós-consulta de rotina',
      diasParaRetorno: 90,
      tomComunicacao: 'acolhedor e cuidadoso',
      mensagemInicial:
        'Olá! Já faz um tempinho desde sua última consulta. Vamos agendar seu retorno?',
    },
  });

  const retornoCirurgia = await prisma.configRetorno.create({
    data: {
      empresaId: empresa.id,
      descricao: 'Retorno pós-cirurgia',
      diasParaRetorno: 15,
      tomComunicacao: 'atencioso e objetivo',
      mensagemInicial: 'Olá! Está na hora do seu retorno pós-cirúrgico. Podemos agendar?',
    },
  });

  const hoje = new Date();
  const diasAtras = (dias: number) => new Date(hoje.getTime() - dias * 86400000);

  await prisma.paciente.createMany({
    data: [
      {
        empresaId: empresa.id,
        nome: 'Marina Alves',
        telefone: TELEFONE_TESTE,
        email: 'marina.alves@demo.com',
        cpf: '11122233344',
        convenio: 'Unimed',
        status: 'RETORNO_PENDENTE',
        ultimaConsulta: diasAtras(95),
        configRetornoId: retornoRotina.id,
      },
      {
        empresaId: empresa.id,
        nome: 'João Pereira',
        telefone: '5521988880002',
        convenio: 'Particular',
        status: 'ATIVO',
        ultimaConsulta: diasAtras(5),
        configRetornoId: retornoCirurgia.id,
      },
      {
        empresaId: empresa.id,
        nome: 'Beatriz Lima',
        telefone: '5521988880003',
        cpf: '55566677788',
        status: 'RETORNO_AGENDADO',
        ultimaConsulta: diasAtras(30),
        configRetornoId: retornoRotina.id,
      },
      {
        empresaId: empresa.id,
        nome: 'Rafael Costa',
        telefone: TELEFONE_TESTE,
        email: 'rafael.costa@demo.com',
        convenio: 'Bradesco Saúde',
        status: 'RETORNO_PENDENTE',
        ultimaConsulta: diasAtras(100),
        configRetornoId: retornoCirurgia.id,
      },
      {
        empresaId: empresa.id,
        nome: 'Camila Duarte',
        telefone: TELEFONE_TESTE,
        cpf: '77788899911',
        convenio: 'Particular',
        status: 'RETORNO_PENDENTE',
        ultimaConsulta: diasAtras(120),
        configRetornoId: retornoRotina.id,
      },
      {
        empresaId: empresa.id,
        nome: 'Eduardo Ribeiro',
        telefone: TELEFONE_TESTE,
        status: 'RETORNO_PENDENTE',
        ultimaConsulta: diasAtras(93),
        configRetornoId: retornoRotina.id,
      },
    ],
  });

  return empresa;
}

async function seedOficina() {
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);

  const empresa = await prisma.empresa.upsert({
    where: { email: 'oficina@demo.com' },
    update: {},
    create: {
      nome: 'Oficina Rápida Demo',
      email: 'oficina@demo.com',
      senha: senhaHash,
      cnpj: '44555666000133',
      telefone: '5531999990003',
      endereco: {
        create: {
          cep: '30130-010',
          logradouro: 'Av. Afonso Pena',
          numero: '1200',
          bairro: 'Centro',
          cidade: 'Belo Horizonte',
          estado: 'MG',
        },
      },
    },
  });

  await prisma.clienteOficina.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.servicoConfig.deleteMany({ where: { empresaId: empresa.id } });

  await prisma.servicoConfig.createMany({
    data: [
      {
        empresaId: empresa.id,
        descricao: 'Revisão de 10.000 km',
        prazoRevisaoDias: 180,
        tomComunicacao: 'amigável e prestativo',
        mensagemInicial: 'Olá! Está na hora da revisão do seu veículo. Vamos agendar?',
      },
      {
        empresaId: empresa.id,
        descricao: 'Troca de óleo',
        prazoRevisaoDias: 90,
        tomComunicacao: 'direto e prático',
        mensagemInicial: 'Olá! Já está na hora de trocar o óleo do seu carro. Podemos agendar?',
      },
    ],
  });

  const hoje = new Date();
  const diasAtras = (dias: number) => new Date(hoje.getTime() - dias * 86400000);

  await prisma.clienteOficina.createMany({
    data: [
      {
        empresaId: empresa.id,
        nome: 'Ricardo Nunes',
        telefone: TELEFONE_TESTE,
        modeloVeiculo: 'Honda Civic 2020',
        placa: 'ABC1D23',
        status: 'REVISAO_PENDENTE',
        ultimaRevisao: diasAtras(190),
      },
      {
        empresaId: empresa.id,
        nome: 'Patrícia Gomes',
        telefone: '5531988880002',
        modeloVeiculo: 'Fiat Argo 2022',
        placa: 'XYZ9K87',
        status: 'ATIVO',
        ultimaRevisao: diasAtras(30),
      },
      {
        empresaId: empresa.id,
        nome: 'Lucas Martins',
        telefone: '5531988880003',
        modeloVeiculo: 'Jeep Compass 2019',
        placa: 'JJK4L56',
        status: 'AGENDADO',
        ultimaRevisao: diasAtras(170),
      },
      {
        empresaId: empresa.id,
        nome: 'Fabiana Cardoso',
        telefone: TELEFONE_TESTE,
        modeloVeiculo: 'Chevrolet Onix 2021',
        placa: 'FCD2E45',
        status: 'REVISAO_PENDENTE',
        ultimaRevisao: diasAtras(185),
      },
      {
        empresaId: empresa.id,
        nome: 'Marcelo Teixeira',
        telefone: TELEFONE_TESTE,
        modeloVeiculo: 'Toyota Corolla 2018',
        placa: 'MTX8B90',
        status: 'REVISAO_PENDENTE',
        ultimaRevisao: diasAtras(210),
      },
      {
        empresaId: empresa.id,
        nome: 'Vanessa Rocha',
        telefone: TELEFONE_TESTE,
        modeloVeiculo: 'Hyundai HB20 2023',
        placa: 'VRC5F12',
        status: 'REVISAO_PENDENTE',
        ultimaRevisao: diasAtras(182),
      },
    ],
  });

  return empresa;
}

async function main() {
  const negocia = await seedNegocia();
  const saude = await seedSaude();
  const oficina = await seedOficina();

  console.log('\nSeed concluído. Login em cada instância:\n');
  console.table([
    { instancia: 'Negocia', email: negocia.email, senha: SENHA_PADRAO },
    { instancia: 'Saúde', email: saude.email, senha: SENHA_PADRAO },
    { instancia: 'Oficina', email: oficina.email, senha: SENHA_PADRAO },
  ]);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
