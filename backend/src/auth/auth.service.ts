import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { Response, Request } from 'express';
import * as bcrypt from 'bcrypt';
import TimeConstant from '../common/constants/time.constant';
import { User } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async refreshToken(req: Request, res: Response) {
    const refreshToken = req.cookies('refresh_token');

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh Token does not exist');
    }
    let payload;
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired Refresh Token');
    }
    const userExist = this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!userExist) {
      throw new BadRequestException('User does not exists');
    }

    const expiration =
      Math.floor(Date.now() / 1000) + TimeConstant.jwt_access_exp;
    const accessToken = this.jwtService.sign(
      { ...payload, exp: expiration },
      { secret: this.configService.get<string>('ACCESS_TOKEN_SECRET') },
    );
    res.cookie('access_token', accessToken, { httpOnly: true });
    return accessToken;
  }


  private async issueToken(user: User, response: Response) {
    const payload = { username: user.fullname, sub: user.id };

    const accessToken = this.jwtService.sign(
      { ...payload, exp: TimeConstant.jwt_access_exp },
      {
        secret: this.configService.get<string>('ACCESS_TOKEN_SECRET'),
      },
    );

    const refreshToken = this.jwtService.sign(
      { ...payload, exp: TimeConstant.jwt_access_exp },
      {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      },
    );
    response.cookie('access_token', accessToken, { httpOnly: true });
    response.cookie('refresh_token', refreshToken, { httpOnly: true });
    return { user };
  }


  async validateUser(loginDto: LoginDto) {
    const user = this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });
    if (
      user &&
      (await bcrypt.compare(loginDto.password, (await user).password))
    ) {
      return user;
    }
    return null;
  }


  async register(registerDto: RegisterDto, response: Response) {
    const existingUser = this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });
    if (existingUser) {
      throw new BadRequestException('The email is already in use, try another');
    }
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullname: registerDto.fullname,
        password: hashedPassword,
        email: registerDto.email,
      },
    });
    return this.issueToken(user, response);
  }


  async login(loginDto: LoginDto, response: Response) {
    const user = await this.validateUser(loginDto);

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }
    return this.issueToken(user, response);
  }

  async logout(response: Response){
    response.clearCookie('access_token');
    response.clearCookie('refresh_token');
    return 'User is logged out '
  }
}
