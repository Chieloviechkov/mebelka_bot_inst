import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const manager = await this.prisma.manager.findFirst({ where: { email } });
    if (!manager || !manager.password_hash) {
      throw new UnauthorizedException('Невірний email або пароль');
    }

    const valid = await bcrypt.compare(password, manager.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Невірний email або пароль');
    }

    const payload = { sub: manager.id, email: manager.email, role: manager.role };
    return {
      access_token: this.jwtService.sign(payload),
      manager: { id: manager.id, name: manager.name, email: manager.email, role: manager.role },
    };
  }

  async register(email: string, password: string, name: string) {
    const existing = await this.prisma.manager.findFirst({ where: { email } });
    if (existing) {
      throw new UnauthorizedException('Email вже зайнятий');
    }

    const password_hash = await bcrypt.hash(password, 10);
    const manager = await this.prisma.manager.create({
      data: {
        email,
        password_hash,
        name,
        telegram_id: `web_${Date.now()}`,
        role: 'supermanager',
      },
    });

    const payload = { sub: manager.id, email: manager.email, role: manager.role };
    return {
      access_token: this.jwtService.sign(payload),
      manager: { id: manager.id, name: manager.name, email: manager.email, role: manager.role },
    };
  }
}
