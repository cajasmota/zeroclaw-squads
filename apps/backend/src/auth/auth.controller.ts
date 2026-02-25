import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { RequestUser } from '@aes/types';
import { AdminOnly } from '../common/decorators/admin-only.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/login')
  @Public()
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('auth/me')
  me(@CurrentUser() user: RequestUser) {
    return user;
  }

  @Post('auth/logout')
  logout() {
    return { message: 'Logged out' };
  }

  @Get('users')
  @AdminOnly()
  findAllUsers(@CurrentUser() user: RequestUser) {
    return this.authService.findAllUsers(new Types.ObjectId(user.tenantId));
  }

  @Post('users')
  @AdminOnly()
  createUser(@CurrentUser() user: RequestUser, @Body() dto: CreateUserDto) {
    return this.authService.createUser(user, dto);
  }

  @Patch('users/:id')
  @AdminOnly()
  updateUser(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.authService.updateUser(
      new Types.ObjectId(user.tenantId),
      id,
      dto,
    );
  }

  @Delete('users/:id')
  @AdminOnly()
  deleteUser(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.authService.deleteUser(new Types.ObjectId(user.tenantId), id);
  }
}
