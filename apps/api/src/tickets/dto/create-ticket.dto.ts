import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  TicketCategory,
  TicketPriority,
  TicketSource,
} from '../../generated/prisma/enums';

export class CreateTicketDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsEnum(TicketSource)
  source?: TicketSource;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  requesterName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  requesterEmail?: string;

  @IsOptional()
  @IsPhoneNumber()
  @MaxLength(30)
  requesterPhone?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
