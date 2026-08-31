export interface EnvironmentVariables {
    NODE_ENV?: string;
    PORT?: string;
    MONGODB_URI?: string;
}
export declare function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables;
