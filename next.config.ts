import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A página /guilda lê os JSONs da pasta data/guild em tempo de execução;
  // isto garante que eles sejam enviados junto com o build em hospedagens serverless.
  outputFileTracingIncludes: {
    "/guilda": ["./data/guild/**/*"],
  },
};

export default nextConfig;
