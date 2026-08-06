import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { existsSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { AttachmentsService } from './attachments.service.js';
import { CreateAttachmentDto } from './dto/create-attachment.dto.js';
import { FindAttachmentsDto } from './dto/find-attachments.dto.js';

const attachmentsUploadDir = join(
  process.cwd(),
  '..',
  'uploads',
  'attachments',
);

function ensureAttachmentsUploadDir() {
  if (!existsSync(attachmentsUploadDir)) {
    mkdirSync(attachmentsUploadDir, {
      recursive: true,
    });
  }
}

@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          ensureAttachmentsUploadDir();
          callback(null, attachmentsUploadDir);
        },
        filename: (_request, file, callback) => {
          const safeExtension = extname(file.originalname).toLowerCase();
          const fileName = `${randomUUID()}${safeExtension}`;

          callback(null, fileName);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  create(
    @Body() createDto: CreateAttachmentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.attachmentsService.create(createDto, file, request.user?.id);
  }

  @Get()
  findAll(@Query() filters: FindAttachmentsDto) {
    return this.attachmentsService.findAll(filters);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() response: Response) {
    const attachment = await this.attachmentsService.findOne(id);
    const filePath = join(process.cwd(), '..', attachment.path);

    return response.download(filePath, attachment.originalName);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attachmentsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attachmentsService.remove(id);
  }
}
