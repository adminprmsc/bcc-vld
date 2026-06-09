declare const _default: (() => {
    nodeEnv: string;
    port: number;
    jwtSecret: string | undefined;
    allowedOrigins: string[];
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    nodeEnv: string;
    port: number;
    jwtSecret: string | undefined;
    allowedOrigins: string[];
}>;
export default _default;
