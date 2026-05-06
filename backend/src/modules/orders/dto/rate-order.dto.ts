import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class RateOrderItemDto {
  @Type(() => Number)
  @IsInt()
  orderItemId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  stars!: number;
}

export class RateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RateOrderItemDto)
  ratings!: RateOrderItemDto[];
}
