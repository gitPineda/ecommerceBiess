import { Transform } from 'class-transformer';
import {
  IsBase64,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Matches,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateCompanyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  appName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  shortName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(({ value }) => String(value).trim().toLowerCase())
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(200)
  tagline!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(160)
  welcomeTitle!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(300)
  welcomeMessage!: string;

  @IsEmail()
  @MaxLength(160)
  @Transform(({ value }) => String(value).trim().toLowerCase())
  supportEmail!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10)
  @Transform(({ value }) => String(value).trim().toUpperCase())
  currency!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8)
  currencySymbol!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(20)
  defaultLocale!: string;

  @Transform(({ value }) => Number.parseInt(String(value).replace(/[^\d-]/g, ''), 10))
  @IsInt()
  @Min(0)
  @Max(100)
  vatPercent!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  logoText!: string;

  @IsOptional()
  @IsString()
  @IsBase64()
  logoBase64?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  logoMimeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  logoFileName?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  clearLogo?: boolean;
}
