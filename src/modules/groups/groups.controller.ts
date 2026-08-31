import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MongoIdPipe } from '../../common/pipes/mongo-id.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AcceptInvitationDto, InviteUserDto } from './dto/invitation.dto';
import { GroupNameDto } from './dto/group.dto';
import { GroupsService } from './groups.service';

@ApiTags('groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'groups', version: '1' })
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}
  @Post() create(
    @Body() dto: GroupNameDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.create(dto, user.userId);
  }
  @Get() list(@CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.list(user.userId);
  }
  @Post('invitations/accept')
  accept(
    @Body() dto: AcceptInvitationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.accept(dto, user.userId);
  }
  @Get(':groupId') @UsePipes(MongoIdPipe) get(
    @Param('groupId') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.get(id, user.userId);
  }
  @Patch(':groupId') @UsePipes(MongoIdPipe) update(
    @Param('groupId') id: string,
    @Body() dto: GroupNameDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.update(id, dto, user.userId);
  }
  @Delete(':groupId') @UsePipes(MongoIdPipe) remove(
    @Param('groupId') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.remove(id, user.userId);
  }
  @Post(':groupId/invitations') @UsePipes(MongoIdPipe) invite(
    @Param('groupId') id: string,
    @Body() dto: InviteUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.invite(id, dto, user.userId);
  }
}
