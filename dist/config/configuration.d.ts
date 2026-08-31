declare const _default: () => {
    nodeEnv: string;
    port: number;
    database: {
        url: string | undefined;
    };
    auth: {
        jwtSecret: string | undefined;
        accessExpiresIn: string;
        refreshExpiresIn: string;
    };
};
export default _default;
