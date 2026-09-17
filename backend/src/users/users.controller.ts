import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { join } from 'node:path';
import { diskStorage } from 'multer';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../generated/prisma/client.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

const profileImagesUploadDir = join(
  process.cwd(),
  '..',
  'uploads',
  'profile-images',
);

const profileImageExtensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function ensureProfileImagesUploadDir() {
  if (!existsSync(profileImagesUploadDir)) {
    mkdirSync(profileImagesUploadDir, {
      recursive: true,
    });
  }
}

function getProfileImageExtension(mimeType: string) {
  return profileImageExtensions[mimeType];
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(
    @Body() createUserDto: CreateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.create(createUserDto, request.user!);
  }

  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPERVISOR,
    UserRole.CLIENT_USER,
    UserRole.TECHNICIAN,
  )
  @Get('me')
  findOwnProfile(@Req() request: AuthenticatedRequest) {
    return this.usersService.findOwnProfile(request.user!);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR)
  @Patch('me')
  updateOwnProfile(
    @Body() updateOwnProfileDto: UpdateOwnProfileDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.updateOwnProfile(
      updateOwnProfileDto,
      request.user!,
    );
  }

  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPERVISOR,
    UserRole.CLIENT_USER,
    UserRole.TECHNICIAN,
  )
  @Post('me/profile-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          ensureProfileImagesUploadDir();
          callback(null, profileImagesUploadDir);
        },
        filename: (_request, file, callback) => {
          const extension = getProfileImageExtension(file.mimetype);

          if (!extension) {
            callback(
              new BadRequestException(
                'Formato de imagem não permitido. Use JPEG, PNG ou WebP.',
              ),
              '',
            );
            return;
          }

          callback(null, `${randomUUID()}${extension}`);
        },
      }),
      fileFilter: (_request, file, callback) => {
        const extension = getProfileImageExtension(file.mimetype);

        if (!extension) {
          callback(
            new BadRequestException(
              'Formato de imagem não permitido. Use JPEG, PNG ou WebP.',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadOwnProfileImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.updateOwnProfileImage(file, request.user!);
  }

  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPERVISOR,
    UserRole.CLIENT_USER,
    UserRole.TECHNICIAN,
  )
  @Get('me/profile-image')
  async getOwnProfileImage(
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const profileImage = await this.usersService.getOwnProfileImage(
      request.user!,
    );

    response.setHeader('Cache-Control', 'private, no-store');

    return response.sendFile(profileImage.absolutePath);
  }

  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPERVISOR,
    UserRole.CLIENT_USER,
    UserRole.TECHNICIAN,
  )
  @Delete('me/profile-image')
  removeOwnProfileImage(@Req() request: AuthenticatedRequest) {
    return this.usersService.removeOwnProfileImage(request.user!);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.update(id, updateUserDto, request.user!);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.usersService.remove(id, request.user!);
  }
}
