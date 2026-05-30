import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Exclude Claude Code agent worktrees (copies of the repo under .claude/).
    // Without this, vitest globs their *.test.ts files and resolves the "@"
    // alias to THIS repo's src, producing spurious cross-tree failures.
    exclude: ["**/node_modules/**", "**/dist/**", "**/.claude/**"],
  },
});
