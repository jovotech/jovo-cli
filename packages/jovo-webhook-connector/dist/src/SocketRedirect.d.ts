/// <reference types="socket.io-client" />
import { PostOptions } from './HttpPost';
export interface ConnectionOptions {
    post?: PostOptions;
}
export declare function open(id: string, webhookBaseUrl: string, options: ConnectionOptions): SocketIOClient.Socket;
export declare function close(): SocketIOClient.Socket;
