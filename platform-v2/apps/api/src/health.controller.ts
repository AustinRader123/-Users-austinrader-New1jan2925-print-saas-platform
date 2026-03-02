import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { ok: true, service: 'api', ts: new Date().toISOString() };
  }

  @Get('api/version')
  version() {
    return {
      version: process.env.APP_VERSION || '1.0.0',
      commit: process.env.APP_COMMIT || 'dev',
      buildTime: process.env.APP_BUILD_TIME || new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
    };
  }
}
