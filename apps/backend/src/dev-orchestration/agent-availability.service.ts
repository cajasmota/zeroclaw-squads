import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AgentInstance,
  AgentInstanceDocument,
} from '../agent-instances/agent-instance.schema';

@Injectable()
export class AgentAvailabilityService {
  constructor(
    @InjectModel(AgentInstance.name)
    private readonly instanceModel: Model<AgentInstanceDocument>,
  ) {}

  async getAvailableAgent(
    projectId: Types.ObjectId,
    role: string,
  ): Promise<AgentInstanceDocument | null> {
    // For developer role, require canWriteCode === true
    const query: Record<string, any> = {
      projectId,
      status: 'idle',
      'aieos_identity.identity.role': { $regex: new RegExp(role, 'i') },
    };
    if (role.toLowerCase() === 'developer') {
      query['config.canWriteCode'] = true;
    }

    const agent = await this.instanceModel
      .findOneAndUpdate(query, { $set: { status: 'busy' } }, { new: true })
      .exec();

    return agent;
  }

  async releaseAgent(agentId: string): Promise<void> {
    await this.instanceModel.findByIdAndUpdate(agentId, {
      $set: { status: 'idle' },
    });
  }
}
