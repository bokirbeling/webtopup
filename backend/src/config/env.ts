const REQUIRED_ENV_KEYS = ["NODE_ENV", "PORT"] as const;

const ALLOWED_NODE_ENVS = ["development", "test", "production"] as const;

type NodeEnv = (typeof ALLOWED_NODE_ENVS)[number];

export type BackendEnv = Readonly<{
  nodeEnv: NodeEnv;
  port: number;
}>;

function isAllowedNodeEnv(value: string): value is NodeEnv {
  return (ALLOWED_NODE_ENVS as readonly string[]).includes(value);
}

function parsePort(rawPort: string): number {
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("[config] Invalid PORT. Expected an integer between 1 and 65535.");
  }

  return port;
}

export function readEnv(rawEnv: NodeJS.ProcessEnv = process.env): BackendEnv {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => {
    const value = rawEnv[key];
    return value === undefined || value.trim() === "";
  });

  if (missingKeys.length > 0) {
    throw new Error(`[config] Missing required environment variables: ${missingKeys.join(", ")}`);
  }

  const nodeEnvRaw = rawEnv.NODE_ENV;
  if (nodeEnvRaw === undefined || !isAllowedNodeEnv(nodeEnvRaw)) {
    throw new Error(
      `[config] Invalid NODE_ENV "${nodeEnvRaw}". Expected one of: ${ALLOWED_NODE_ENVS.join(", ")}.`
    );
  }

  const portRaw = rawEnv.PORT;
  if (portRaw === undefined) {
    throw new Error("[config] Missing required environment variables: PORT");
  }

  return {
    nodeEnv: nodeEnvRaw,
    port: parsePort(portRaw)
  };
}
