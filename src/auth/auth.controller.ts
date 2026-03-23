import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email та пароль обов\'язкові');
    }
    return this.authService.login(body.email, body.password);
  }

  @Post('register')
  async register(@Body() body: { email: string; password: string; name: string }) {
    if (!body.email || !body.password || !body.name) {
      throw new BadRequestException('Email, пароль та ім\'я обов\'язкові');
    }
    return this.authService.register(body.email, body.password, body.name);
  }
}
