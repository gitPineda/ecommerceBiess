import { Body, Controller, Post, Req } from '@nestjs/common';
import { buildAuditRequestContext } from '../audit/utils/build-audit-request-context';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyPasswordResetCodeDto } from './dto/verify-password-reset-code.dto';
import { RequestLike } from '../audit/interfaces/audit-request-context.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() payload: RegisterDto, @Req() request: RequestLike) {
    return this.authService.register(payload, buildAuditRequestContext(request));
  }

  @Post('login')
  login(@Body() payload: LoginDto, @Req() request: RequestLike) {
    return this.authService.login(payload, buildAuditRequestContext(request));
  }

  @Post('forgot-password')
  forgotPassword(@Body() payload: ForgotPasswordDto, @Req() request: RequestLike) {
    return this.authService.forgotPassword(
      payload,
      buildAuditRequestContext(request),
    );
  }

  @Post('forgot-password/verify')
  verifyForgotPasswordCode(
    @Body() payload: VerifyPasswordResetCodeDto,
    @Req() request: RequestLike,
  ) {
    return this.authService.verifyForgotPasswordCode(
      payload,
      buildAuditRequestContext(request),
    );
  }

  @Post('forgot-password/reset')
  resetForgottenPassword(
    @Body() payload: ResetPasswordDto,
    @Req() request: RequestLike,
  ) {
    return this.authService.resetForgottenPassword(
      payload,
      buildAuditRequestContext(request),
    );
  }
}
