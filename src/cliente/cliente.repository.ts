import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/browser';

@Injectable()
export class ClienteRepository {
  constructor(private prisma: PrismaService) {}
}
