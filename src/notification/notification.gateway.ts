// src/notification/notification.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { UseGuards } from '@nestjs/common';
  import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
  import { Notification } from './entities/notification.entity';
  import { NotificationService } from './notification.service';
  
  @WebSocketGateway({
    cors: {
      origin: '*', // In production, specify your frontend origin
    },
    namespace: '/notifications',
    transports: ['websocket'],
    upgrade: false // Disable transport upgrade
  })
  export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    constructor(private notificationService: NotificationService) {}
  
    private connectedClients: Map<string, Socket[]> = new Map();
  
    @UseGuards(WsJwtGuard)
    handleConnection(client: Socket) {
        try {
          const userId = client.data.user?.id;
          if (userId) {
            console.log(`User ${userId} connected to notifications`);
            if (!this.connectedClients.has(userId)) {
              this.connectedClients.set(userId, []);
            }
            // Use the non-null assertion operator or create a variable
            const userClients = this.connectedClients.get(userId)!; // Option 1: Using non-null assertion
            userClients.push(client);
            
            // Alternative approach:
            // const userClients = this.connectedClients.get(userId) || [];
            // userClients.push(client);
            // this.connectedClients.set(userId, userClients);
          }
        } catch (error) {
          console.error('Error in handleConnection:', error);
          client.disconnect();
        }
      }
  
    handleDisconnect(client: Socket) {
      try {
        const userId = client.data.user?.id;
        if (userId) {
          console.log(`User ${userId} disconnected from notifications`);
          const userClients = this.connectedClients.get(userId) || [];
          const index = userClients.indexOf(client);
          if (index !== -1) {
            userClients.splice(index, 1);
          }
          if (userClients.length === 0) {
            this.connectedClients.delete(userId);
          }
        }
      } catch (error) {
        console.error('Error in handleDisconnect:', error);
      }
    }
  
    @SubscribeMessage('getUnreadCount')
    @UseGuards(WsJwtGuard)
    async handleGetUnreadCount(@ConnectedSocket() client: Socket) {
      try {
        const userId = client.data.user?.id;
        if (userId) {
          const count = await this.notificationService.countUnread(userId);
          client.emit('unreadCount', { count });
        }
      } catch (error) {
        console.error('Error in handleGetUnreadCount:', error);
      }
    }
  
    @SubscribeMessage('markAsRead')
    @UseGuards(WsJwtGuard)
    async handleMarkAsRead(
      @MessageBody() data: { notificationId: string },
      @ConnectedSocket() client: Socket
    ) {
      try {
        const userId = client.data.user?.id;
        if (userId) {
          const notification = await this.notificationService.findOne(data.notificationId);
          if (notification.userId === userId) {
            await this.notificationService.markAsRead(data.notificationId);
            client.emit('notificationRead', { id: data.notificationId });
            
            // Update unread count
            const count = await this.notificationService.countUnread(userId);
            client.emit('unreadCount', { count });
          }
        }
      } catch (error) {
        console.error('Error in handleMarkAsRead:', error);
      }
    }
  
    sendNotificationToUser(userId: string, notification: Notification) {
      const userClients = this.connectedClients.get(userId) || [];
      userClients.forEach(client => {
        client.emit('notification', notification);
      });
    }
  
    async sendNotificationToAll(notification: Notification) {
      this.server.emit('notification', notification);
    }
  }