import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, ValidateIf } from 'class-validator';

export class AssignCustomerDto {
  @ApiProperty({ nullable: true, description: 'User id to assign, or null to unassign' })
  @ValidateIf((dto: AssignCustomerDto) => dto.assigneeId !== null)
  @IsUUID()
  assigneeId!: string | null;
}
