import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { LoginResponse, RegisterResponse } from './types';
import { RegisterDto } from './dto/register.dto';
import { Request, Response } from 'express';
import { BadRequestException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => RegisterResponse)
  async register(
    @Args('registerInput') registerDto: RegisterDto,
    @Context() Context: { res: Response },
  ) {
    if (registerDto.password !== registerDto.confirmPassword) {
      throw new BadRequestException({
        confirmPassword: 'Password and confirmPassword does not match',
      });
    }
    const { user } = await this.authService.register(registerDto, Context.res);
    return { user };
  }

  @Mutation(() => LoginResponse)
  async login(
    @Args('loginInput') loginDto: LoginDto,
    @Context() Context: { res: Response },
  ) {
    return this.authService.login(loginDto, Context.res);
  }

  @Mutation(() => String)
  async logout(@Context() context: { res: Response }) {
    return this.authService.logout(context.res);
  }

  @Query(() => String)
  async hello() {
    return 'Hello';
  }

  @Mutation(() => String)
  async refreshToken(@Context() Context: { req: Request; res: Response }) {
    try {
      return this.authService.refreshToken(Context.req, Context.res);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
