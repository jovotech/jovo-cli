import { Promise } from 'es6-promise';
export interface PostOptions {
    hostname?: string;
    port?: string;
    timeout?: number;
}
export declare function post(data: object, headers: object, queryParams: object, options: PostOptions | undefined): Promise<object>;
