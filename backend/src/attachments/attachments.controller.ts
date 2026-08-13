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
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { diskStorage } from 'multer';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../generated/prisma/client.js';
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

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
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
    return this.attachmentsService.create(createDto, file, request.user!);
  }

  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPERVISOR,
    UserRole.CLIENT_USER,
    UserRole.TECHNICIAN,
  )
  @Get()
  findAll(
    @Query() filters: FindAttachmentsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.attachmentsService.findAll(filters, request.user!);
  }

  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPERVISOR,
    UserRole.CLIENT_USER,
    UserRole.TECHNICIAN,
  )
  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const attachment = await this.attachmentsService.findOne(id, request.user!);

    const filePath = join(process.cwd(), '..', attachment.path);

    return response.download(filePath, attachment.originalName);
  }

  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPERVISOR,
    UserRole.CLIENT_USER,
    UserRole.TECHNICIAN,
  )
  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.attachmentsService.findOne(id, request.user!);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.attachmentsService.remove(id, request.user!);
  }
}
