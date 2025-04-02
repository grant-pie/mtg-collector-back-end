// src/notification/notification.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../user/enums/role.enum';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  findAll(@Query() query: QueryNotificationDto) {
    return this.notificationService.findAll(query);
  }

  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  findMyNotifications(@Request() req) {
    const userId = req.user.id;
    return this.notificationService.findByUser(userId);
  }

  @Get('my/unread')
  @UseGuards(AuthGuard('jwt'))
  findMyUnreadNotifications(@Request() req) {
    const userId = req.user.id;
    return this.notificationService.findUnreadByUser(userId);
  }

  @Get('my/count')
  @UseGuards(AuthGuard('jwt'))
  countMyUnreadNotifications(@Request() req) {
    const userId = req.user.id;
    return this.notificationService.countUnread(userId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findOne(@Param('id') id: string, @Request() req) {
    const notification = await this.notificationService.findOne(id);
    
    // Check if the notification belongs to the user or if the user is an admin
    if (notification.userId !== req.user.id && req.user.role !== Role.ADMIN) {
      throw new ForbiddenException('You do not have permission to access this notification');
    }
    
    return notification;
  }

  @Patch(':id/read')
  @UseGuards(AuthGuard('jwt'))
  async markAsRead(@Param('id') id: string, @Request() req) {
    const notification = await this.notificationService.findOne(id);
    
    // Check if the notification belongs to the user
    if (notification.userId !== req.user.id && req.user.role !== Role.ADMIN) {
      throw new ForbiddenException('You do not have permission to mark this notification as read');
    }
    
    return this.notificationService.markAsRead(id);
  }

  @Patch('my/read-all')
  @UseGuards(AuthGuard('jwt'))
  markAllAsRead(@Request() req) {
    const userId = req.user.id;
    return this.notificationService.markAllAsRead(userId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateNotificationDto: UpdateNotificationDto) {
    return this.notificationService.update(id, updateNotificationDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: string, @Request() req) {
    const notification = await this.notificationService.findOne(id);
    
    // Check if the notification belongs to the user or if the user is an admin
    if (notification.userId !== req.user.id && req.user.role !== Role.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this notification');
    }
    
    return this.notificationService.remove(id);
  }
}