import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsBoolean()
  @IsOptional()
  isInternal?: boolean = false;
}