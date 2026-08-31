import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { LoginDto } from './dto/login.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { EmailVerificationDto } from './dto/email-verification.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetCompleteDto } from './dto/password-reset-complete.dto';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: HttpStatus.CREATED, type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid registration data' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  register(@Body() dto: RegisterDto): Promise<UserResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in with an email or username' })
  @ApiResponse({ status: HttpStatus.OK, type: TokenResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid login data' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate a refresh token' })
  @ApiResponse({ status: HttpStatus.OK, type: TokenResponseDto })
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke a refresh session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Refresh session revoked',
  })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto);
  }

  @Post('password-reset/request')
  @ApiOperation({ summary: 'Request a password reset' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reset request accepted' })
  requestPasswordReset(
    @Body() dto: PasswordResetRequestDto,
  ): Promise<{ accepted: true }> {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/complete')
  @ApiOperation({ summary: 'Complete a password reset' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset completed',
  })
  completePasswordReset(
    @Body() dto: PasswordResetCompleteDto,
  ): Promise<{ reset: true }> {
    return this.authService.completePasswordReset(dto);
  }

  @Post('email-verification/verify')
  @ApiOperation({ summary: 'Verify an email address' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Email verified' })
  verifyEmail(@Body() dto: EmailVerificationDto): Promise<{ verified: true }> {
    return this.authService.verifyEmail(dto);
  }

  @Post('email-verification/resend')
  @ApiOperation({ summary: 'Request an email verification message' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification request accepted',
  })
  resendVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<{ accepted: true }> {
    return this.authService.resendVerification(dto);
  }
}
