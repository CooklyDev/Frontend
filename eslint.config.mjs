import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

function withoutReactPlugin(config) {
  if (!config?.plugins?.react) {
    return config;
  }

  const plugins = { ...config.plugins };
  const rules = Object.fromEntries(
    Object.entries(config.rules ?? {}).filter(([ruleName]) => !ruleName.startsWith("react/")),
  );
  const settings = { ...(config.settings ?? {}) };

  delete plugins.react;
  delete settings.react;

  return {
    ...config,
    plugins,
    rules,
    ...(Object.keys(settings).length > 0 ? { settings } : {}),
  };
}

const eslintConfig = defineConfig([
  ...nextVitals.map(withoutReactPlugin),
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
