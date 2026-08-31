import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApplicationException } from '../../common/errors/application.exception';
import { ErrorCode } from '../../common/errors/error-code';
import { Position, PositionDocument } from './schemas/position.schema';

export const CANONICAL_POSITIONS = [
  { name: 'Goalkeeper', abbreviation: 'GK' },
  { name: 'Defender', abbreviation: 'DEF' },
  { name: 'Midfielder', abbreviation: 'MID' },
  { name: 'Forward', abbreviation: 'FWD' },
] as const;

@Injectable()
export class PositionsService {
  constructor(
    @InjectModel(Position.name) private readonly positionModel: Model<Position>,
  ) {}

  findAll(): Promise<PositionDocument[]> {
    return this.positionModel.find().sort({ abbreviation: 1 }).exec();
  }

  async findById(id: string): Promise<PositionDocument> {
    const position = await this.positionModel.findById(id).exec();
    if (!position) {
      throw new ApplicationException(
        404,
        ErrorCode.POSITION_NOT_FOUND,
        'Position not found',
      );
    }
    return position;
  }

  async seedCanonicalPositions(): Promise<void> {
    for (const position of CANONICAL_POSITIONS) {
      await this.positionModel
        .updateOne(
          { abbreviation: position.abbreviation },
          { $setOnInsert: position },
          { upsert: true },
        )
        .exec();
    }
  }
}
