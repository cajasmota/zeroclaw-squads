import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface McpToolResult {
  tool: string;
  result: string;
}

@Injectable()
export class LibrarianMcpService {
  private readonly logger = new Logger(LibrarianMcpService.name);

  private get parserUrl(): string {
    return this.config.get<string>('LIBRARIAN_PARSER_URL', 'http://localhost:5001');
  }

  private get graphUrl(): string {
    return this.config.get<string>('LIBRARIAN_GRAPH_URL', 'http://localhost:5002');
  }

  constructor(private readonly config: ConfigService) {}

  async findLogic(query: string): Promise<McpToolResult> {
    try {
      const resp = await axios.post(`${this.parserUrl}/find-logic`, { query }, { timeout: 10000 });
      return { tool: 'find_logic', result: JSON.stringify(resp.data) };
    } catch {
      return { tool: 'find_logic', result: `No results for: ${query}` };
    }
  }

  async askQuestion(question: string): Promise<McpToolResult> {
    try {
      const resp = await axios.post(`${this.parserUrl}/ask`, { question }, { timeout: 10000 });
      return { tool: 'ask_question', result: JSON.stringify(resp.data) };
    } catch {
      return { tool: 'ask_question', result: `Cannot answer: ${question}` };
    }
  }

  async getTypeDefinition(typeName: string): Promise<McpToolResult> {
    try {
      const resp = await axios.get(`${this.parserUrl}/types/${encodeURIComponent(typeName)}`, { timeout: 10000 });
      return { tool: 'get_type_definition', result: JSON.stringify(resp.data) };
    } catch {
      return { tool: 'get_type_definition', result: `Type not found: ${typeName}` };
    }
  }

  async getComponentSample(componentName: string): Promise<McpToolResult> {
    try {
      const resp = await axios.get(`${this.parserUrl}/samples/${encodeURIComponent(componentName)}`, { timeout: 10000 });
      return { tool: 'get_component_sample', result: JSON.stringify(resp.data) };
    } catch {
      return { tool: 'get_component_sample', result: `Sample not found: ${componentName}` };
    }
  }

  async analyzeImpact(filePath: string): Promise<McpToolResult> {
    try {
      const resp = await axios.post(`${this.graphUrl}/analyze-impact`, { filePath }, { timeout: 10000 });
      return { tool: 'analyze_impact', result: JSON.stringify(resp.data) };
    } catch {
      return { tool: 'analyze_impact', result: `Impact analysis unavailable for: ${filePath}` };
    }
  }

  async checkConventionCompliance(filePath: string, content: string): Promise<McpToolResult> {
    try {
      const resp = await axios.post(
        `${this.parserUrl}/check-compliance`,
        { filePath, content },
        { timeout: 10000 },
      );
      return { tool: 'check_convention_compliance', result: JSON.stringify(resp.data) };
    } catch {
      return { tool: 'check_convention_compliance', result: 'Compliance check unavailable' };
    }
  }

  async handleToolCall(toolName: string, params: Record<string, any>): Promise<McpToolResult> {
    switch (toolName) {
      case 'find_logic': return this.findLogic(params.query);
      case 'ask_question': return this.askQuestion(params.question);
      case 'get_type_definition': return this.getTypeDefinition(params.typeName);
      case 'get_component_sample': return this.getComponentSample(params.componentName);
      case 'analyze_impact': return this.analyzeImpact(params.filePath);
      case 'check_convention_compliance': return this.checkConventionCompliance(params.filePath, params.content);
      default: return { tool: toolName, result: `Unknown tool: ${toolName}` };
    }
  }
}
