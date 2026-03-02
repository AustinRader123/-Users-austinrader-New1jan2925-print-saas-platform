import { Controller, Get } from '@nestjs/common';

@Controller('api/files')
export class FilesController {
  @Get('presign')
  presign() {
    return {
      uploadUrl: 'https://example.invalid/upload',
      method: 'PUT',
      expiresIn: 300,
    };
  }
}
