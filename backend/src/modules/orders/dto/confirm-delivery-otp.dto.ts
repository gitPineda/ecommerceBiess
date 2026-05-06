import { IsString, Length } from 'class-validator';

export class ConfirmDeliveryOtpDto {
  @IsString()
  @Length(4, 6)
  otp!: string;
}
