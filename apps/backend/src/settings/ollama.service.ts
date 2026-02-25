import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);

  private get endpoint(): string {
    return this.config.get<string>('OLLAMA_ENDPOINT', 'http://localhost:11434');
  }

  constructor(private readonly config: ConfigService) {}

  async isHealthy(): Promise<boolean> {
    try {
      await axios.get(`${this.endpoint}/api/tags`, { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<{ healthy: boolean; models: any[] }> {
    try {
      const resp = await axios.get(`${this.endpoint}/api/tags`, {
        timeout: 5000,
      });
      return { healthy: true, models: resp.data.models ?? [] };
    } catch {
      return { healthy: false, models: [] };
    }
  }

  async pullModel(modelName: string): Promise<void> {
    await axios.post(
      `${this.endpoint}/api/pull`,
      { name: modelName },
      { timeout: 300000 },
    );
    this.logger.log(`Pulled model: ${modelName}`);
  }

  async deleteModel(modelName: string): Promise<void> {
    await axios.delete(`${this.endpoint}/api/delete`, {
      data: { name: modelName },
      timeout: 10000,
    });
    this.logger.log(`Deleted model: ${modelName}`);
  }

  async unloadModel(modelName: string): Promise<void> {
    await axios.post(
      `${this.endpoint}/api/generate`,
      { model: modelName, keep_alive: 0 },
      { timeout: 10000 },
    );
  }

  async loadModel(modelName: string): Promise<void> {
    await axios.post(
      `${this.endpoint}/api/generate`,
      { model: modelName, keep_alive: -1 },
      { timeout: 30000 },
    );
  }
}
