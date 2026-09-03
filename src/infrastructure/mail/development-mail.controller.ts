import { Controller, Delete, Get } from '@nestjs/common';
import { DevelopmentMailService } from './development-mail.service';

@Controller({ path: 'dev/mail', version: '1' })
export class DevelopmentMailController {
  constructor(
    private readonly developmentMailService: DevelopmentMailService,
  ) {}

  @Get()
  getMessages() {
    return this.developmentMailService.getMessages();
  }

  @Delete()
  clearMessages(): { cleared: true } {
    this.developmentMailService.clearMessages();
    return { cleared: true };
  }
}
