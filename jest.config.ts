import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  preset: "ts-jest",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "CommonJS",
          moduleResolution: "node",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: false,
        },
      },
    ],
  },
  clearMocks: true,
  collectCoverageFrom: [
    "src/lib/**/*.ts",
    "src/middleware.ts",
    "src/hooks/**/*.ts",
    "!src/lib/prisma.ts",
    "!src/lib/redis.ts",
  ],
  coverageReporters: ["text", "lcov"],
};

export default config;
