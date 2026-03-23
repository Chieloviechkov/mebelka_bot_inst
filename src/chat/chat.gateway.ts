import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({
  cors: {
    origin: [
      'https://frontend-one-rho-36.vercel.app',
      'https://frontend-chieloviechkovs-projects.vercel.app',
      ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173'] : []),
    ],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string);
      if (!token) {
        client.disconnect();
        return;
      }
      const secret = process.env.JWT_SECRET || 'mebelka_secret_key_2024';
      const payload = jwt.verify(token, secret) as any;
      (client as any).managerId = payload.sub;
      this.logger.log(`Manager ${payload.sub} connected via WS`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const mid = (client as any).managerId;
    if (mid) this.logger.log(`Manager ${mid} disconnected`);
  }

  /** Emit new message to all connected managers */
  emitNewMessage(leadId: number, message: any) {
    this.server.emit('newMessage', { leadId, message });
  }

  /** Emit lead updated (new lead, assignment change, etc.) */
  emitLeadUpdate(leadId: number, data?: any) {
    this.server.emit('leadUpdate', { leadId, ...data });
  }
}
