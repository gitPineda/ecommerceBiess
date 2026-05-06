import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
