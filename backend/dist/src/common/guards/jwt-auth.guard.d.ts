import { ExecutionContext } from '@nestjs/common';
declare const JwtAuthGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class JwtAuthGuard extends JwtAuthGuard_base {
    handleRequest<TUser>(err: Error | null, user: TUser): TUser;
    canActivate(context: ExecutionContext): Promise<boolean>;
}
export {};
