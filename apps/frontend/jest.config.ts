import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          esModuleInterop: true,
          module: "commonjs",
          moduleResolution: "node",
          paths: { "@/*": ["./*"] },
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/styleMock.ts",
    "^next/navigation$": "<rootDir>/__mocks__/next/navigation.ts",
    "^next/image$": "<rootDir>/__mocks__/next/image.tsx",
    "^@tiptap/react$": "<rootDir>/__mocks__/tiptap.ts",
    "^@tiptap/(.*)$": "<rootDir>/__mocks__/tiptap.ts",
    "^lowlight$": "<rootDir>/__mocks__/tiptap.ts",
    "^lowlight/(.*)$": "<rootDir>/__mocks__/tiptap.ts",
  },
  testMatch: ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};

export default config;
