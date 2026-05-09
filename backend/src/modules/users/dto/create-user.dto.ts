import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  firstName!: string;

  @IsString()
  @MinLength(2)
  lastName!: string;

  @IsString()
  @MinLength(3)
  username!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsIn(['superadmin', 'admin', 'seller', 'customer'])
  role!: 'superadmin' | 'admin' | 'seller' | 'customer';

  @IsOptional()
  @IsString()
  cedulaRuc?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  ciudad?: string;

  @IsOptional()
  @IsString()
  cuentaBancaria?: string;

  @IsOptional()
  @IsString()
  cuentaPayphone?: string;

  @IsOptional()
  @IsBoolean()
  verificado?: boolean;
}
