import { IsHexColor, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsHexColor()
  brandColor?: string;

  @IsOptional()
  @IsObject()
  config?: {
    slackToken?: string;
    slackSigningSecret?: string;
    slackChannelId?: string;
    repoUrl?: string;
    githubApp?: {
      appId?: string;
      privateKey?: string;
      installationId?: string;
      webhookSecret?: string;
    };
    inviteUsers?: string[];
    llmKeys?: {
      openai?: string;
      anthropic?: string;
      google?: string;
      ollama_endpoint?: string;
    };
  };
}
