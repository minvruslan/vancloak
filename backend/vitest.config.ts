import { fileURLToPath } from "node:url"
import { configDefaults, defineConfig } from "vitest/config"

const FullCoverageThresholds = { statements: 100, branches: 100, functions: 100, lines: 100 }

const filesWithoutCoverageRequirement: string[] = [
  "src/api/index.ts",
  "src/worker/**",
  "src/core/database/schemas/**",
  "src/core/database/checkDatabaseConnection.ts",
  "src/core/mailer/**",
  "src/core/queue/checkQueueConnection.ts",
]

const integrationTestGlobs = [
  "tests/src/api/**/*.test.ts",
  "tests/src/core/bootstraps/**/*.test.ts",
  "tests/src/core/database/**/*.test.ts",
  "tests/helpers/**/*.test.ts",
]

export default defineConfig({
  resolve: {
    alias: {
      "@tests": fileURLToPath(new URL("./tests", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    reporters: ["tree"],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/**/*.test.ts"],
          exclude: [...configDefaults.exclude, ...integrationTestGlobs],
          setupFiles: [
            "tests/setup/setupTestEnvironment.ts",
            "tests/setup/mockSendLoginCodeEmail.ts",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: integrationTestGlobs,
          fileParallelism: false,
          setupFiles: [
            "tests/setup/setupTestEnvironment.ts",
            "tests/setup/mockSendLoginCodeEmail.ts",
            "tests/setup/resetDatabaseBetweenTests.ts",
          ],
          globalSetup: ["tests/setup/prepareTestDatabase.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: filesWithoutCoverageRequirement,
      thresholds: FullCoverageThresholds,
    },
  },
})
