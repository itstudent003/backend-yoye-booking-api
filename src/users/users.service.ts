import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { ...dto, password: hashed },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true, lastLogin: true, createdAt: true },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, line: true, lastLogin: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);
    if (dto.password) dto.password = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, updatedAt: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.user.delete({ where: { id } });
  }
}
