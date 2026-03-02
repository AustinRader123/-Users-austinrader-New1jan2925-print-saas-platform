import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/ws', cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    client.emit('connected', { id: client.id, ts: new Date().toISOString() });
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage('jobs:subscribe')
  onJobsSubscribe(client: Socket, payload: { tenantId: string; storeId?: string }) {
    if (payload?.tenantId) client.join(`tenant:${payload.tenantId}`);
    if (payload?.storeId) client.join(`store:${payload.storeId}`);
    return { ok: true };
  }

  publishJobUpdate(tenantId: string, update: unknown) {
    this.server.to(`tenant:${tenantId}`).emit('jobs:update', update);
  }
}
