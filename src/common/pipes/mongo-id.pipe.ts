import { Injectable, PipeTransform } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { ErrorCode } from '../errors/error-code';
import { ApplicationException } from '../errors/application.exception';

@Injectable()
export class MongoIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isValidObjectId(value)) {
      throw new ApplicationException(
        400,
        ErrorCode.BAD_REQUEST,
        'Invalid MongoDB identifier',
      );
    }
    return value;
  }
}
