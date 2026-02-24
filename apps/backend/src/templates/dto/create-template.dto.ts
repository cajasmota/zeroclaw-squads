import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class TemplateConfigDto {
  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsEnum(['ollama', 'openai', 'anthropic', 'google'])
  provider?: string;

  @IsOptional()
  @IsString()
  skills?: string;

  @IsOptional()
  @IsBoolean()
  canWriteCode?: boolean;

  @IsOptional()
  @IsArray()
  mcpServers?: any[];
}

export class CreateTemplateDto {
  @IsString()
  displayName: string;

  @IsEnum(['librarian', 'architect', 'pm', 'developer', 'reviewer', 'tester'])
  role: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  soul?: string;

  @IsOptional()
  @IsObject()
  aieos_identity?: Record<string, any>;

  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateConfigDto)
  config?: TemplateConfigDto;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
