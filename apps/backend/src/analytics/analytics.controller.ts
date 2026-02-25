import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RequestUser } from '@aes/types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsageEvent, UsageEventDocument } from './usage-event.schema';
import { Transcript, TranscriptDocument } from './transcript.schema';

@Controller('projects/:id/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    @InjectModel(UsageEvent.name)
    private readonly usageEventModel: Model<UsageEventDocument>,
    @InjectModel(Transcript.name)
    private readonly transcriptModel: Model<TranscriptDocument>,
  ) {}

  @Get('burn-rate')
  async getBurnRate(
    @CurrentUser() user: RequestUser,
    @Param('id') projectId: string,
  ) {
    const tenantId = new Types.ObjectId(user.tenantId);
    const result = await this.usageEventModel.aggregate([
      { $match: { projectId: new Types.ObjectId(projectId), tenantId } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          totalCost: { $sum: '$costUsd' },
          totalTokens: { $sum: '$totalTokens' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return result.map((r) => ({
      date: r._id,
      totalCost: r.totalCost,
      totalTokens: r.totalTokens,
    }));
  }

  @Get('distribution')
  async getDistribution(
    @CurrentUser() user: RequestUser,
    @Param('id') projectId: string,
  ) {
    const tenantId = new Types.ObjectId(user.tenantId);
    return this.usageEventModel.aggregate([
      { $match: { projectId: new Types.ObjectId(projectId), tenantId } },
      {
        $group: {
          _id: '$model',
          totalCost: { $sum: '$costUsd' },
          totalTokens: { $sum: '$totalTokens' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalCost: -1 } },
    ]);
  }

  @Get('transcripts')
  getTranscripts(
    @CurrentUser() user: RequestUser,
    @Param('id') projectId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const tenantId = new Types.ObjectId(user.tenantId);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    return this.transcriptModel
      .find(
        { projectId: new Types.ObjectId(projectId), tenantId },
        { entries: 0 },
      )
      .sort({ archivedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean()
      .exec();
  }

  @Get('transcripts/:runId')
  getTranscript(
    @CurrentUser() user: RequestUser,
    @Param('id') projectId: string,
    @Param('runId') runId: string,
  ) {
    return this.transcriptModel
      .findOne({
        projectId: new Types.ObjectId(projectId),
        tenantId: new Types.ObjectId(user.tenantId),
        runId,
      })
      .lean()
      .exec();
  }
}
