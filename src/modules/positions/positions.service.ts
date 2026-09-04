import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApplicationException } from '../../common/errors/application.exception';
import { ErrorCode } from '../../common/errors/error-code';
import { Position, PositionDocument } from './schemas/position.schema';

export const POSITION_ABBREVIATIONS = ['GK', 'DEF', 'MID', 'FWD'] as const;

export const CANONICAL_POSITIONS = [
  { name: 'Kaleci', abbreviation: 'GK' },
  { name: 'Defans', abbreviation: 'DEF' },
  { name: 'Orta Saha', abbreviation: 'MID' },
  { name: 'Forvet', abbreviation: 'FWD' },
] as const;

const POSITION_ORDER: Record<string, number> = {
  GK: 0,
  DEF: 1,
  MID: 2,
  FWD: 3,
};

@Injectable()
export class PositionsService {
  constructor(
    @InjectModel(Position.name) private readonly positionModel: Model<Position>,
  ) {}

  async findAll(): Promise<PositionDocument[]> {
    const positions = await this.positionModel.find().exec();
    return [...positions].sort(
      (left, right) =>
        (POSITION_ORDER[left.abbreviation] ?? Number.MAX_SAFE_INTEGER) -
        (POSITION_ORDER[right.abbreviation] ?? Number.MAX_SAFE_INTEGER),
    );
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
          { $set: position },
          { upsert: true },
        )
        .exec();
    }
  }
}
