// src/user/user.controller.ts
import { Controller, Get, Patch, Body, UseGuards, Param, NotFoundException, Request, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from './enums/role.enum';
import { UpdateUsernameDto } from './dto/update-username.dto';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async findAll() {
    const users = await this.userService.findAll();
    
    // Removing sensitive information before sending
    return users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      picture: user.picture,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt
    }));
  }

  @Get('usernames')
  async getAllUsernames() {
    const users = await this.userService.findAll();
    
    // Filter out any users without usernames and only return usernames
    return users
      .filter(user => user.username)
      .map(user => ({
        id: user.id,
        username: user.username
      }));
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async findOne(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    // Removing sensitive information before sending
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      picture: user.picture,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt
    };
  }

  @Get('username/:username')
  async findByUsername(@Param('username') username: string) {
    const user = await this.userService.findByUsername(username);
    
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }
    
    // Return only public information
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      picture: user.picture,
    };
  }

  @Patch('username')
  @UseGuards(AuthGuard('jwt'))
  async updateUsername(@Request() req, @Body() updateUsernameDto: UpdateUsernameDto) {
    // req.user comes from the JWT strategy
    const userId = req.user.id;
    
    const updatedUser = await this.userService.updateUsername(userId, updateUsernameDto);
    
    return {
      id: updatedUser.id,
      username: updatedUser.username,
      message: 'Username updated successfully'
    };
  }

  @Patch(':id/username')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async updateUsernameByAdmin(
    @Param('id') id: string,
    @Body() updateUsernameDto: UpdateUsernameDto,
    @Request() req
  ) {
    // Check if admin is trying to update themselves
    if (req.user.id === id && req.user.role === Role.ADMIN) {
      // Admin can update their own username using the regular endpoint
      return this.updateUsername(req, updateUsernameDto);
    }
    
    const updatedUser = await this.userService.updateUsername(id, updateUsernameDto);
    
    return {
      id: updatedUser.id,
      username: updatedUser.username,
      message: 'Username updated successfully by admin'
    };
  }
}