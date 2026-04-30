import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateNoteDto {
  @ApiProperty({ example: 'Spoke with customer about renewal timeline.' })
  @IsString()
  @MinLength(1)
  content!: string;
}

