// @ts-check

import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
    {
        rules: {
            "@typescript-eslint/consistent-type-definitions": ["error", "type"],
            "@typescript-eslint/no-unsed-vars": [
                "error",
                { caughtErrors: "none" },
            ],
        },
    },
    eslint.configs.recommended,
    tseslint.configs.strict,
    tseslint.configs.stylistic
);
