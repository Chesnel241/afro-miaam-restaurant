import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Exclude:
    //  - Claude Code agent worktrees (copies of the repo under .claude/) — globbing them
    //    would resolve the "@" alias to THIS repo's src and produce spurious failures.
    //  - e2e/ — Playwright specs (different runner; vitest can't parse the playwright "test" import).
    exclude: ["**/node_modules/**", "**/dist/**", "**/.claude/**", "**/e2e/**"],
  },
});
