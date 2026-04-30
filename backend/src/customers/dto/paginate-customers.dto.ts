import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsPositive, IsString, Max } from 'class-validator';

export class PaginateCustomersDto {
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsBoolean()
  deletedOnly?: boolean = false;
}
