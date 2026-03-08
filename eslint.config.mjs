// @ts-check

import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
    globalIgnores(["dist/**", "node_modules/**"]),
    {
        rules: {
            "@typescript-eslint/consistent-type-definitions": ["error", "type"],
        },
    },
    eslint.configs.recommended,
    tseslint.configs.strict,
    tseslint.configs.stylistic
);
