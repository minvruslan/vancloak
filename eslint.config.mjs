import tseslint from "typescript-eslint"
import eslintConfigPrettier from "eslint-config-prettier"

const EXTERNAL_NAMES = new Set(["baseURL", "sendVerificationOTP", "useTagRC", "useTagRD"])

const UPPERCASE_RUN_PATTERN = /[A-Z]{2,}/
const SCREAMING_SNAKE_PATTERN = /^[A-Z0-9_]+$/

const camelCaseAcronymsRule = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      uppercaseRun:
        'Acronyms in "{{name}}" must be camelCase (sshPort, clientIp, userApi), not uppercase runs.',
    },
  },
  create(context) {
    const check = (node) => {
      if (!node || node.type !== "Identifier") return
      const { name } = node
      if (EXTERNAL_NAMES.has(name)) return
      if (SCREAMING_SNAKE_PATTERN.test(name)) return
      if (!UPPERCASE_RUN_PATTERN.test(name)) return
      context.report({ node, messageId: "uppercaseRun", data: { name } })
    }

    const checkFunctionParameters = (node) => {
      for (const parameter of node.params) {
        if (parameter.type === "Identifier") check(parameter)
        if (parameter.type === "AssignmentPattern") check(parameter.left)
      }
    }

    return {
      VariableDeclarator: (node) => check(node.id),
      FunctionDeclaration: (node) => check(node.id),
      ClassDeclaration: (node) => check(node.id),
      TSTypeAliasDeclaration: (node) => check(node.id),
      TSInterfaceDeclaration: (node) => check(node.id),
      TSEnumDeclaration: (node) => check(node.id),
      FunctionExpression: checkFunctionParameters,
      ArrowFunctionExpression: checkFunctionParameters,
      PropertyDefinition: (node) => !node.computed && check(node.key),
      MethodDefinition: (node) => !node.computed && check(node.key),
      TSPropertySignature: (node) => !node.computed && check(node.key),
      TSMethodSignature: (node) => !node.computed && check(node.key),
      Property: (node) =>
        !node.computed && node.parent.type === "ObjectExpression" && check(node.key),
    }
  },
}

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.nuxt/**",
      "**/.output/**",
      "**/dist/**",
      "**/coverage/**",
      "frontend/",
      "infrastructure/src/remote-server/protocols/*/vendor/**",
    ],
  },
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["infrastructure/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@vancloak/api-contract", "@vancloak/api-contract/*", "@vancloak/backend*"],
              message: "Infrastructure must not depend on application packages.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["infrastructure/src/types/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "node:*",
                "@vancloak/api-contract",
                "@vancloak/api-contract/*",
                "@vancloak/backend*",
              ],
              message:
                "The types subpackage must stay runtime-free (zod only) so the frontend can import it.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/src/**/*.ts"],
    plugins: {
      vancloakNaming: {
        rules: {
          "camel-case-acronyms": camelCaseAcronymsRule,
        },
      },
    },
    rules: {
      "vancloakNaming/camel-case-acronyms": "error",
    },
  },
)
