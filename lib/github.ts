interface GitHubFile {
  name: string;
  path: string;
  type: "file" | "dir";
  content?: string;
  size: number;
}

interface GitHubRepo {
  name: string;
  full_name: string;
  description: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  private: boolean;
}

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

interface FileAnalysis {
  path: string;
  content: string;
  size: number;
  language: string;
  issues: string[];
  strengths: string[];
  complexity: number;
  maintainability: number;
  readability: number;
}

export class GitHubAnalyzer {
  private baseUrl = "https://api.github.com";
  private token = process.env.GITHUB_TOKEN;
  private requestCount = 0;
  private lastRequestTime = 0;

  private async fetchWithAuth(url: string, retries = 3) {
    // Rate limiting: GitHub allows 5000 requests per hour for authenticated users
    const now = Date.now();
    if (this.requestCount >= 100 && now - this.lastRequestTime < 60000) {
      // Wait if we've made too many requests in the last minute
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "QuantaCode-Analyzer",
    };

    if (this.token) {
      headers["Authorization"] = `token ${this.token}`;
    }

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers,
        });

        this.requestCount++;
        this.lastRequestTime = now;

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(
              "Repository not found. Please check the URL or ensure the repository is public."
            );
          } else if (response.status === 403) {
            const rateLimitRemaining = response.headers.get(
              "x-ratelimit-remaining"
            );
            if (rateLimitRemaining === "0") {
              throw new Error(
                "GitHub API rate limit exceeded. Please try again later or add a GitHub token."
              );
            }
            throw new Error(
              "Access denied. The repository may be private or rate limit exceeded."
            );
          } else if (response.status === 401) {
            throw new Error(
              "Authentication failed. Please check your GitHub token."
            );
          } else if (response.status >= 500) {
            // Server error, retry
            if (attempt < retries - 1) {
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * (attempt + 1))
              );
              continue;
            }
            throw new Error(`GitHub API server error: ${response.status}`);
          }
          throw new Error(
            `GitHub API error: ${response.status} ${response.statusText}`
          );
        }

        return response.json();
      } catch (error) {
        if (attempt === retries - 1) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1))
        );
      }
    }
  }

  async getRepoInfo(owner: string, repo: string): Promise<GitHubRepo> {
    return this.fetchWithAuth(`${this.baseUrl}/repos/${owner}/${repo}`);
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string
  ): Promise<string> {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`
      );

      if (response.content) {
        return Buffer.from(response.content, "base64").toString("utf-8");
      }
      return "";
    } catch (error) {
      console.warn(`Could not fetch ${path}:`, error);
      return "";
    }
  }

  async getDirectoryContents(
    owner: string,
    repo: string,
    path: string = ""
  ): Promise<GitHubFile[]> {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`
      );

      if (Array.isArray(response)) {
        return response.map((file) => ({
          name: file.name,
          path: file.path,
          type: file.type,
          size: file.size || 0,
        }));
      }
      return [];
    } catch (error) {
      console.warn(`Could not fetch directory ${path}:`, error);
      return [];
    }
  }

  async getAllFiles(
    owner: string,
    repo: string,
    path: string = "",
    maxDepth: number = 3,
    maxFiles: number = 200
  ): Promise<GitHubFile[]> {
    if (maxDepth <= 0) return [];

    const files = await this.getDirectoryContents(owner, repo, path);
    const allFiles: GitHubFile[] = [];

    for (const file of files) {
      if (allFiles.length >= maxFiles) break;

      if (file.type === "file") {
        allFiles.push(file);
      } else if (file.type === "dir" && !this.shouldSkipDirectory(file.name)) {
        const subFiles = await this.getAllFiles(
          owner,
          repo,
          file.path,
          maxDepth - 1,
          maxFiles - allFiles.length
        );
        allFiles.push(...subFiles);
      }
    }

    return allFiles;
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
      "node_modules",
      ".git",
      "dist",
      "build",
      ".next",
      "coverage",
      ".nyc_output",
      "__pycache__",
      ".pytest_cache",
      "venv",
      "env",
      "vendor",
      "target",
      "bin",
      "obj",
      ".vscode",
      ".idea",
    ];
    return skipDirs.includes(dirName) || dirName.startsWith(".");
  }

  async analyzeRepository(owner: string, repo: string) {
    console.log(`🔬 Starting repository analysis for ${owner}/${repo}`);

    try {
      const repoInfo = await this.getRepoInfo(owner, repo);
      console.log(
        `📊 Repository info retrieved: ${repoInfo.language}, ${repoInfo.stargazers_count} stars`
      );

      const allFiles = await this.getAllFiles(owner, repo, "", 3, 150);
      console.log(`📁 Found ${allFiles.length} files`);

      // Get key files with timeout protection
      const [packageJson, readme] = await Promise.allSettled([
        this.getPackageJson(owner, repo),
        this.getFileContent(owner, repo, "README.md"),
      ]);

      // Get detailed file analysis for code files
      const codeFiles = await this.getDetailedCodeFiles(
        owner,
        repo,
        allFiles,
        30
      );
      console.log(`💻 Analyzed ${codeFiles.length} code files`);

      return {
        repoInfo,
        packageJson:
          packageJson.status === "fulfilled" ? packageJson.value : null,
        readme: readme.status === "fulfilled" ? readme.value : "",
        files: allFiles,
        codeFiles,
      };
    } catch (error) {
      console.error(
        `❌ Repository analysis failed for ${owner}/${repo}:`,
        error
      );
      throw error;
    }
  }

  private async getPackageJson(
    owner: string,
    repo: string
  ): Promise<PackageJson | null> {
    try {
      const content = await this.getFileContent(owner, repo, "package.json");
      return content ? JSON.parse(content) : null;
    } catch (error) {
      return null;
    }
  }

  private async getDetailedCodeFiles(
    owner: string,
    repo: string,
    files: GitHubFile[],
    maxFiles = 30
  ): Promise<FileAnalysis[]> {
    const codeExtensions = [
      ".js",
      ".ts",
      ".jsx",
      ".tsx",
      ".py",
      ".java",
      ".cpp",
      ".c",
      ".go",
      ".rs",
      ".php",
      ".rb",
      ".swift",
      ".kt",
      ".css",
      ".scss",
      ".html",
      ".vue",
      ".json",
      ".md",
    ];

    const codeFiles = files
      .filter(
        (file) =>
          file.type === "file" &&
          codeExtensions.some((ext) => file.name.endsWith(ext)) &&
          file.size < 100000 && // Skip very large files
          !file.path.includes(".min.") && // Skip minified files
          !file.path.includes("vendor") &&
          !file.path.includes("node_modules") &&
          !this.shouldSkipDirectory(file.path.split("/")[0])
      )
      .sort((a, b) => {
        // Prioritize important files
        const importantFiles = [
          "package.json",
          "README.md",
          "index.js",
          "index.ts",
          "main.py",
          "app.py",
        ];
        const aImportant = importantFiles.includes(a.name);
        const bImportant = importantFiles.includes(b.name);
        if (aImportant && !bImportant) return -1;
        if (!aImportant && bImportant) return 1;
        return b.size - a.size; // Then by size
      })
      .slice(0, maxFiles);

    const results: FileAnalysis[] = [];
    const batchSize = 5; // Process files in batches to avoid overwhelming the API

    for (let i = 0; i < codeFiles.length; i += batchSize) {
      const batch = codeFiles.slice(i, i + batchSize);
      const batchPromises = batch.map(async (file) => {
        try {
          const content = await this.getFileContent(owner, repo, file.path);
          if (content && content.length > 0) {
            return this.analyzeFile(file, content);
          }
          return null;
        } catch (error) {
          console.warn(`Could not fetch ${file.path}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          results.push(result.value);
        }
      });

      // Small delay between batches to be respectful to the API
      if (i + batchSize < codeFiles.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  private analyzeFile(file: GitHubFile, content: string): FileAnalysis {
    const lines = content.split("\n");
    const language = this.getLanguageFromExtension(file.name);
    const issues: string[] = [];
    const strengths: string[] = [];

    // Basic analysis
    if (lines.length > 300) {
      issues.push(
        "File is quite large and might benefit from being split into smaller modules"
      );
    }

    if (content.includes("console.log") && !file.path.includes("debug")) {
      issues.push(
        "Contains console.log statements that should be removed in production"
      );
    }

    if (content.includes("TODO") || content.includes("FIXME")) {
      issues.push("Contains TODO or FIXME comments that need attention");
    }

    // Language-specific analysis
    if (language === "javascript" || language === "typescript") {
      this.analyzeJavaScript(content, issues, strengths);
    } else if (language === "python") {
      this.analyzePython(content, issues, strengths);
    }

    // Calculate metrics
    const complexity = this.calculateComplexity(content, language);
    const maintainability = this.calculateMaintainability(
      content,
      issues.length
    );
    const readability = this.calculateReadability(content, lines.length);

    return {
      path: file.path,
      content: content.slice(0, 2000), // Limit content size for performance
      size: file.size,
      language,
      issues,
      strengths,
      complexity,
      maintainability,
      readability,
    };
  }

  private analyzeJavaScript(
    content: string,
    issues: string[],
    strengths: string[]
  ) {
    // Check for good practices
    if (content.includes("use strict")) {
      strengths.push("Uses strict mode");
    }

    if (content.match(/\/\*\*[\s\S]*?\*\//)) {
      strengths.push("Contains JSDoc documentation");
    }

    if (content.includes("const ") && !content.includes("var ")) {
      strengths.push("Uses modern const/let instead of var");
    }

    // Check for issues
    if (content.includes("eval(")) {
      issues.push("Uses eval() which can be dangerous");
    }

    if (content.match(/function\s+\w+\s*\([^)]*\)\s*{[^}]{200,}}/)) {
      issues.push("Contains long functions that could be refactored");
    }

    if (
      !content.includes("export") &&
      !content.includes("module.exports") &&
      content.includes("function")
    ) {
      issues.push("Functions are not exported, limiting reusability");
    }
  }

  private analyzePython(
    content: string,
    issues: string[],
    strengths: string[]
  ) {
    // Check for good practices
    if (content.includes('"""') || content.includes("'''")) {
      strengths.push("Contains docstrings for documentation");
    }

    if (content.includes('if __name__ == "__main__":')) {
      strengths.push("Uses proper main guard pattern");
    }

    if (content.includes("typing") || content.includes("Type")) {
      strengths.push("Uses type hints for better code clarity");
    }

    // Check for issues
    if (content.includes("import *")) {
      issues.push("Uses wildcard imports which can cause namespace pollution");
    }

    if (
      !content.includes('"""') &&
      !content.includes("'''") &&
      content.includes("def ")
    ) {
      issues.push("Functions lack docstrings");
    }

    if (content.includes("except:") && !content.includes("except Exception:")) {
      issues.push("Uses bare except clauses which can hide errors");
    }
  }

  private calculateComplexity(content: string, language: string): number {
    let complexity = 1; // Base complexity

    // Count decision points with safe regex patterns
    const decisionPatterns = [
      /\bif\b/g,
      /\belse\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /&&/g,
      /\|\|/g,
      /\?/g,
    ];

    for (const pattern of decisionPatterns) {
      try {
        const matches = content.match(pattern);
        if (matches) {
          complexity += matches.length;
        }
      } catch (error) {
        // Skip this pattern if it causes an error
        console.warn("Regex pattern error:", error);
      }
    }

    // Normalize to 1-10 scale
    return Math.min(10, Math.max(1, Math.round(complexity / 5)));
  }

  private calculateMaintainability(
    content: string,
    issueCount: number
  ): number {
    const lines = content.split("\n").length;
    let score = 100;

    // Deduct for file size
    if (lines > 200) score -= (lines - 200) / 10;

    // Deduct for issues
    score -= issueCount * 10;

    // Bonus for comments
    const commentLines = content
      .split("\n")
      .filter(
        (line) =>
          line.trim().startsWith("//") ||
          line.trim().startsWith("/*") ||
          line.trim().startsWith("*") ||
          line.trim().startsWith("#")
      ).length;

    if (commentLines > lines * 0.1) score += 10; // 10% comments is good

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  private calculateReadability(content: string, lineCount: number): number {
    let score = 80; // Base score

    // Check indentation consistency
    const lines = content.split("\n");
    const indentedLines = lines.filter((line) => line.match(/^\s+/));
    const inconsistentIndent = indentedLines.some(
      (line) => !line.match(/^  /) && !line.match(/^    /) && !line.match(/^\t/)
    );

    if (inconsistentIndent) score -= 20;

    // Check line length
    const longLines = lines.filter((line) => line.length > 120).length;
    score -= (longLines / lines.length) * 30;

    // Check naming conventions
    const hasGoodNaming =
      content.match(/\b[a-z][a-zA-Z0-9]*\b/) && !content.match(/\b[a-z]\b/); // No single letter vars
    if (hasGoodNaming) score += 10;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  private getLanguageFromExtension(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      go: "go",
      rs: "rust",
      php: "php",
      rb: "ruby",
      swift: "swift",
      kt: "kotlin",
      css: "css",
      scss: "css",
      html: "html",
      vue: "html",
      json: "json",
      md: "markdown",
    };

    return langMap[ext || ""] || "text";
  }
}
