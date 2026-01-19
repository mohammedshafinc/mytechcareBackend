// admin.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // later restrict to admin domain
  },
})
export class AdminGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    client.join('admins');
    console.log('Admin connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Admin disconnected:', client.id);
  }

  notifyNewRequest(data: any) {
    this.server.to('admins').emit('new-request', data);
  }
}
