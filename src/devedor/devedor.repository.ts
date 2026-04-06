import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/browser';

@Injectable()
export class DevedorRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.DevedorCreateInput) {
    return this.prisma.devedor.create({ data });
  }
}
