import js from "@eslint/js"
import order from "eslint-plugin-import"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "import": order
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/strict-boolean-expressions": [
        "warn",
        {
          "allowString": false,
          "allowNumber": false,
          "allowNullableObject": false
        }
      ],
      "quotes": ["error"],
      "semi": ["error"],
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
          pathGroups: [
            {
              pattern: "react**",
              group: "external",
              position: "before",
            },
            {
              pattern: "@material-ui/**",
              group: "external",
              position: "after",
            },
          ],
          pathGroupsExcludedImportTypes: ["react"],
        },
      ]
    },
  },
)
