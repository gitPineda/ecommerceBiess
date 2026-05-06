import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  @Transform(({ value }) => String(value).trim().toUpperCase())
  sku!: string;

  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @IsString()
  categoryId!: string;

  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  stock!: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isPromotion?: boolean;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  @Max(90)
  promotionDiscount?: number;

  @IsString()
  @MinLength(5)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8_500_000)
  imageBase64?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  imageMimeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageFileName?: string;
}
