import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    handleConnection(client: Socket): void;
    handleDisconnect(_client: Socket): void;
    onJobsSubscribe(client: Socket, payload: {
        tenantId: string;
        storeId?: string;
    }): {
        ok: boolean;
    };
    publishJobUpdate(tenantId: string, update: unknown): void;
}
