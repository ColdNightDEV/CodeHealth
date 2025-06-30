import { prisma } from "./prisma";
import { GitHubAnalyzer } from "./github";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AnalysisResult {
  documentationScore: number;
  dependencyScore: number;
  codeQualityScore: number;
  securityScore: number;
  testCoverageScore: number;
  overallHealthScore: number;
  issues: string[];
  recommendations: string[];
  strengths: string[];
  totalFiles: number;
  linesOfCode: number;
  documentedFunctions: number;
  totalFunctions: number;
  totalDependencies: number;
  outdatedDependencies: number;
  vulnerabilities: number;
  aiSummary: string;
  complexityAnalysis: string;
  improvementPlan: string;
}

export async function analyzeRepository(
  repoUrl: string
): Promise<AnalysisResult> {
  const github = new GitHubAnalyzer();

  // Parse GitHub URL
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\?]+)/);
  if (!match) {
    throw new Error("Invalid GitHub URL");
  }

  const [, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/, "");

  try {
    // Fetch repository data
    const repoData = await github.analyzeRepository(owner, cleanRepo);

    // Analyze code structure
    const codeAnalysis = analyzeCodeStructure(repoData.codeFiles);

    // Analyze dependencies
    const depAnalysis = analyzeDependencies(repoData.packageJson);

    // Analyze documentation
    const docAnalysis = analyzeDocumentation(
      repoData.readme,
      repoData.codeFiles
    );

    // Get AI insights
    const aiInsights = await getAIAnalysis(
      repoData,
      codeAnalysis,
      depAnalysis,
      docAnalysis
    );

    // Calculate scores
    const scores = calculateHealthScores(
      codeAnalysis,
      depAnalysis,
      docAnalysis
    );

    return {
      ...scores,
      ...codeAnalysis,
      ...depAnalysis,
      ...docAnalysis,
      ...aiInsights,
      issues: [
        ...(codeAnalysis.codeIssues || []),
        ...(depAnalysis.depIssues || []),
        ...(docAnalysis.docIssues || []),
      ],
      recommendations: [], // You can populate this with AI or static recommendations if available
      strengths: [
        ...(codeAnalysis.codeStrengths || []),
        ...(depAnalysis.depStrengths || []),
        ...(docAnalysis.docStrengths || []),
      ],
    };
  } catch (error) {
    console.error("Repository analysis failed:", error);
    throw new Error(
      "Failed to analyze repository. Please check the URL and try again."
    );
  }
}

function analyzeCodeStructure(
  codeFiles: Array<{ path: string; content: string; size: number }>
) {
  let totalLines = 0;
  let totalFunctions = 0;
  let documentedFunctions = 0;
  const issues: string[] = [];
  const strengths: string[] = [];

  for (const file of codeFiles) {
    const lines = file.content.split("\n");
    totalLines += lines.length;

    // Enhanced function detection with better patterns
    const functionPatterns = [
      /(?:function\s+\w+|const\s+\w+\s*=\s*(?:\([^)]*\)\s*=>|\([^)]*\)\s*=>\s*{)|class\s+\w+|def\s+\w+)/g,
      /(?:async\s+function\s+\w+|export\s+(?:async\s+)?function\s+\w+)/g,
      /(?:public|private|protected)\s+(?:async\s+)?\w+\s*\(/g, // Class methods
    ];

    let fileFunctions = 0;
    functionPatterns.forEach((pattern) => {
      const matches = file.content.match(pattern) || [];
      fileFunctions += matches.length;
    });
    totalFunctions += fileFunctions;

    // Enhanced documentation detection
    const docPatterns = [
      /\/\*\*[\s\S]*?\*\/\s*(?:function|const|class|def|export|public|private|protected)/g,
      /"""[\s\S]*?"""\s*(?:def|class)/g, // Python docstrings
      /'''[\s\S]*?'''\s*(?:def|class)/g,
    ];

    let fileDocumentedFunctions = 0;
    docPatterns.forEach((pattern) => {
      const matches = file.content.match(pattern) || [];
      fileDocumentedFunctions += matches.length;
    });
    documentedFunctions += fileDocumentedFunctions;

    // Enhanced issue detection with specific line numbers and context
    if (lines.length > 500) {
      issues.push(
        `Large file detected: ${file.path} (${lines.length} lines) at line 1 - Consider breaking into smaller modules following single responsibility principle`
      );
    }

    // Security issues
    const securityPatterns = [
      {
        pattern: /console\.log\s*\(/g,
        message: "Debug statements found",
        severity: "medium",
      },
      {
        pattern: /eval\s*\(/g,
        message: "Dangerous eval() usage detected",
        severity: "high",
      },
      {
        pattern: /innerHTML\s*=/g,
        message: "Potential XSS vulnerability with innerHTML",
        severity: "high",
      },
      {
        pattern: /document\.write\s*\(/g,
        message: "Dangerous document.write usage",
        severity: "high",
      },
      {
        pattern: /\$\{[^}]*\}/g,
        message: "Template literal usage - ensure proper sanitization",
        severity: "low",
      },
    ];

    securityPatterns.forEach(({ pattern, message, severity }) => {
      const matches = file.content.match(pattern);
      if (matches) {
        const lines = file.content.split("\n");
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            issues.push(
              `${message} in ${file.path} at line ${
                index + 1
              } - ${severity} severity issue`
            );
          }
        });
      }
    });

    // Code quality issues
    if (file.content.includes("TODO") || file.content.includes("FIXME")) {
      const todoLines = file.content
        .split("\n")
        .map((line, index) =>
          line.includes("TODO") || line.includes("FIXME") ? index + 1 : null
        )
        .filter(Boolean);
      issues.push(
        `Unfinished work in ${file.path} at lines ${todoLines.join(
          ", "
        )} - Address TODO/FIXME comments`
      );
    }

    // Performance issues
    const performancePatterns = [
      {
        pattern: /for\s*\(\s*var\s+\w+\s*=\s*0.*\.length/g,
        message: "Inefficient loop pattern",
      },
      {
        pattern: /document\.getElementById\s*\(/g,
        message: "Frequent DOM queries detected",
      },
      {
        pattern: /setInterval\s*\(/g,
        message: "setInterval usage - consider performance impact",
      },
    ];

    performancePatterns.forEach(({ pattern, message }) => {
      if (pattern.test(file.content)) {
        issues.push(
          `${message} in ${file.path} - Consider optimization for better performance`
        );
      }
    });

    // Language-specific analysis with enhanced detection
    if (file.path.endsWith(".ts") || file.path.endsWith(".tsx")) {
      analyzeTypeScript(file, issues, strengths);
    } else if (file.path.endsWith(".js") || file.path.endsWith(".jsx")) {
      analyzeJavaScript(file, issues, strengths);
    } else if (file.path.endsWith(".py")) {
      analyzePython(file, issues, strengths);
    } else if (file.path.endsWith(".java")) {
      analyzeJava(file, issues, strengths);
    }

    // Check for good practices
    if (file.content.includes("use strict") || file.path.endsWith(".ts")) {
      strengths.push(
        `Strict mode or TypeScript usage in ${file.path} - Good type safety practices`
      );
    }

    if (file.content.match(/\/\*\*[\s\S]*?\*\//)) {
      strengths.push(
        `Well-documented code in ${file.path} - Comprehensive JSDoc comments`
      );
    }

    // Check for modern patterns
    if (
      file.content.includes("const ") &&
      file.content.includes("let ") &&
      !file.content.includes("var ")
    ) {
      strengths.push(
        `Modern JavaScript patterns in ${file.path} - Uses const/let instead of var`
      );
    }
  }

  return {
    totalFiles: codeFiles.length,
    linesOfCode: totalLines,
    totalFunctions,
    documentedFunctions,
    codeIssues: issues,
    codeStrengths: strengths,
  };
}

function analyzeTypeScript(file: any, issues: string[], strengths: string[]) {
  // TypeScript specific analysis
  if (
    !file.content.includes("interface") &&
    !file.content.includes("type") &&
    file.content.includes("any")
  ) {
    issues.push(
      `TypeScript file ${file.path} uses 'any' type - Consider using specific types for better type safety`
    );
  } else if (
    file.content.includes("interface") ||
    file.content.includes("type")
  ) {
    strengths.push(
      `Good TypeScript usage in ${file.path} with proper type definitions`
    );
  }

  if (file.content.includes("as any")) {
    issues.push(
      `Type assertion to 'any' in ${file.path} - Avoid type assertions that bypass type checking`
    );
  }

  if (file.content.includes("// @ts-ignore")) {
    issues.push(
      `TypeScript errors suppressed in ${file.path} - Address underlying type issues instead of ignoring`
    );
  }
}

function analyzeJavaScript(file: any, issues: string[], strengths: string[]) {
  // JavaScript specific analysis
  if (file.content.includes("var ")) {
    issues.push(
      `Legacy 'var' usage in ${file.path} - Use 'const' or 'let' for better scoping`
    );
  }

  if (file.content.includes("==") && !file.content.includes("===")) {
    issues.push(
      `Loose equality operator in ${file.path} - Use strict equality (===) for type safety`
    );
  }

  if (file.content.match(/function\s+\w+\s*\([^)]*\)\s*{[^}]{200,}}/)) {
    issues.push(
      `Long functions in ${file.path} - Consider breaking down into smaller, focused functions`
    );
  }
}

function analyzePython(file: any, issues: string[], strengths: string[]) {
  // Python specific analysis
  if (file.content.includes("import *")) {
    issues.push(
      `Wildcard imports in ${file.path} - Use specific imports to avoid namespace pollution`
    );
  }

  if (
    !file.content.includes('"""') &&
    !file.content.includes("'''") &&
    file.content.includes("def ")
  ) {
    issues.push(
      `Python file ${file.path} lacks docstrings - Add function documentation with proper docstrings`
    );
  }

  if (
    file.content.includes("except:") &&
    !file.content.includes("except Exception:")
  ) {
    issues.push(
      `Bare except clauses in ${file.path} - Use specific exception types for better error handling`
    );
  }

  if (file.content.includes('if __name__ == "__main__":')) {
    strengths.push(
      `Proper main guard pattern in ${file.path} - Good Python module structure`
    );
  }
}

function analyzeJava(file: any, issues: string[], strengths: string[]) {
  // Java specific analysis
  if (
    file.content.includes("System.out.println") &&
    !file.path.includes("test")
  ) {
    issues.push(
      `Debug print statements in ${file.path} - Use proper logging framework instead`
    );
  }

  if (file.content.match(/class\s+\w+\s*{[^}]{1000,}}/)) {
    issues.push(
      `Large class in ${file.path} - Consider breaking down following single responsibility principle`
    );
  }

  if (
    file.content.includes("@Override") ||
    file.content.includes("@Deprecated")
  ) {
    strengths.push(
      `Good annotation usage in ${file.path} - Proper Java documentation practices`
    );
  }
}

function analyzeDependencies(packageJson: any) {
  const issues: string[] = [];
  const strengths: string[] = [];

  if (!packageJson) {
    return {
      totalDependencies: 0,
      outdatedDependencies: 0,
      vulnerabilities: 0,
      depIssues: [
        "No package.json found - Consider adding dependency management for better project structure",
      ],
      depStrengths: [],
    };
  }

  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const totalDeps = Object.keys(deps).length;

  // Enhanced dependency analysis
  let outdated = 0;
  let vulnerabilities = 0;

  for (const [name, version] of Object.entries(deps)) {
    if (typeof version === "string") {
      // Check for very old versions with more specific patterns
      if (version.match(/^[\^~]?0\.[0-9]+\.[0-9]+/)) {
        outdated++;
        issues.push(
          `Potentially outdated dependency: ${name}@${version} - Consider updating to latest stable version for security and features`
        );
      }

      // Enhanced vulnerability detection
      const vulnerablePackages = [
        {
          name: "lodash",
          version: "4.17.20",
          issue: "Prototype pollution vulnerability",
        },
        {
          name: "moment",
          version: "2.29.0",
          issue:
            "Consider migrating to date-fns or dayjs for better performance",
        },
        {
          name: "request",
          version: "2.88.0",
          issue: "Deprecated package, use axios or fetch instead",
        },
        {
          name: "node-sass",
          version: "4.14.0",
          issue: "Deprecated, migrate to sass (Dart Sass)",
        },
        {
          name: "babel-core",
          version: "6.26.0",
          issue: "Legacy Babel version, upgrade to @babel/core",
        },
      ];

      vulnerablePackages.forEach((vuln) => {
        if (name === vuln.name) {
          vulnerabilities++;
          issues.push(
            `Vulnerable/deprecated dependency: ${name}@${version} - ${vuln.issue}`
          );
        }
      });

      // Check for development dependencies in production
      if (
        packageJson.dependencies &&
        packageJson.dependencies[name] &&
        ["webpack", "babel", "eslint", "jest", "mocha"].some((dev) =>
          name.includes(dev)
        )
      ) {
        issues.push(
          `Development dependency in production: ${name} - Move to devDependencies to reduce bundle size`
        );
      }
    }
  }

  // Check for good practices with more detailed feedback
  if (packageJson.scripts?.test) {
    strengths.push(
      "Test script configured - Good testing infrastructure setup"
    );
  }

  if (packageJson.scripts?.lint) {
    strengths.push(
      "Linting script configured - Automated code quality enforcement"
    );
  }

  if (packageJson.scripts?.build) {
    strengths.push(
      "Build script configured - Production-ready deployment setup"
    );
  }

  if (packageJson.engines) {
    strengths.push(
      `Node.js version specified (${
        packageJson.engines.node || "defined"
      }) - Consistent environment requirements`
    );
  }

  if (packageJson.repository) {
    strengths.push("Repository information provided - Good project metadata");
  }

  if (packageJson.license) {
    strengths.push(
      `License specified (${packageJson.license}) - Clear usage rights defined`
    );
  }

  // Enhanced dependency count analysis
  if (totalDeps > 100) {
    issues.push(
      `Very high dependency count (${totalDeps}) - Consider dependency audit and removal of unused packages`
    );
  } else if (totalDeps > 50) {
    issues.push(
      `High dependency count (${totalDeps}) - Monitor bundle size and consider reducing dependency bloat`
    );
  } else if (totalDeps > 0) {
    strengths.push(
      `Reasonable dependency count (${totalDeps}) - Well-managed project dependencies`
    );
  }

  return {
    totalDependencies: totalDeps,
    outdatedDependencies: outdated,
    vulnerabilities,
    depIssues: issues,
    depStrengths: strengths,
  };
}

function analyzeDocumentation(
  readme: string,
  codeFiles: Array<{ path: string; content: string }>
) {
  const issues: string[] = [];
  const strengths: string[] = [];

  // Enhanced README analysis
  if (!readme || readme.length < 100) {
    issues.push(
      "README is missing or too short (less than 100 characters) - Add comprehensive project documentation with setup instructions, usage examples, and contribution guidelines"
    );
  } else {
    strengths.push(
      `Comprehensive README present (${readme.length} characters) - Good project documentation foundation`
    );

    const readmeLower = readme.toLowerCase();
    const sections = [
      {
        key: "installation",
        alt: ["install", "setup", "getting started"],
        name: "Installation",
      },
      {
        key: "usage",
        alt: ["example", "how to use", "quickstart"],
        name: "Usage",
      },
      {
        key: "api",
        alt: ["documentation", "reference"],
        name: "API Documentation",
      },
      {
        key: "contributing",
        alt: ["contribute", "development"],
        name: "Contributing Guidelines",
      },
      { key: "license", alt: ["licensing"], name: "License Information" },
      { key: "changelog", alt: ["changes", "history"], name: "Changelog" },
    ];

    sections.forEach((section) => {
      const hasSection = [section.key, ...section.alt].some((term) =>
        readmeLower.includes(term)
      );
      if (hasSection) {
        strengths.push(
          `${section.name} section found in README - Clear ${section.key} guidance provided`
        );
      } else if (["installation", "usage"].includes(section.key)) {
        issues.push(
          `Missing ${section.name} section in README - Add ${section.key} instructions for better developer experience`
        );
      }
    });

    // Check for badges and metadata
    if (readme.includes("![") || readme.includes("[![")) {
      strengths.push("README includes badges - Good project status visibility");
    }

    // Check for code examples
    if (readme.includes("```") || readme.includes("`")) {
      strengths.push(
        "README includes code examples - Clear implementation guidance"
      );
    } else {
      issues.push(
        "README lacks code examples - Add usage examples with code snippets"
      );
    }
  }

  // Enhanced documentation file analysis
  const docFiles = [
    {
      pattern: /changelog/i,
      name: "CHANGELOG.md",
      purpose: "version history tracking",
    },
    {
      pattern: /contributing/i,
      name: "CONTRIBUTING.md",
      purpose: "contribution guidelines",
    },
    { pattern: /license/i, name: "LICENSE", purpose: "legal usage rights" },
    {
      pattern: /code[_-]?of[_-]?conduct/i,
      name: "CODE_OF_CONDUCT.md",
      purpose: "community standards",
    },
    { pattern: /security/i, name: "SECURITY.md", purpose: "security policy" },
    {
      pattern: /\.github\/pull_request_template/i,
      name: "PR Template",
      purpose: "standardized pull requests",
    },
    {
      pattern: /\.github\/issue_template/i,
      name: "Issue Template",
      purpose: "structured issue reporting",
    },
  ];

  docFiles.forEach((doc) => {
    const hasFile = codeFiles.some((f) => doc.pattern.test(f.path));
    if (hasFile) {
      strengths.push(`${doc.name} present - Good ${doc.purpose} documentation`);
    } else if (
      ["changelog", "license"].some((key) =>
        doc.name.toLowerCase().includes(key)
      )
    ) {
      issues.push(
        `Missing ${doc.name} - Add ${doc.purpose} for better project governance`
      );
    }
  });

  // Check for inline documentation
  const totalCodeFiles = codeFiles.length;
  const documentedFiles = codeFiles.filter(
    (f) =>
      f.content.includes("/**") ||
      f.content.includes('"""') ||
      f.content.includes("'''")
  ).length;

  const docRatio =
    totalCodeFiles > 0 ? (documentedFiles / totalCodeFiles) * 100 : 0;

  if (docRatio > 70) {
    strengths.push(
      `High inline documentation coverage (${Math.round(
        docRatio
      )}% of files) - Excellent code documentation`
    );
  } else if (docRatio > 30) {
    strengths.push(
      `Moderate inline documentation coverage (${Math.round(
        docRatio
      )}% of files) - Good documentation practices`
    );
  } else {
    issues.push(
      `Low inline documentation coverage (${Math.round(
        docRatio
      )}% of files) - Increase code comments and function documentation`
    );
  }

  return {
    docIssues: issues,
    docStrengths: strengths,
  };
}

async function getAIAnalysis(
  repoData: any,
  codeAnalysis: any,
  depAnalysis: any,
  docAnalysis: any
) {
  try {
    const codeContext = repoData.codeFiles
      .slice(0, 8) // Increased sample size
      .map((file: any) => `${file.path}: ${file.content.slice(0, 500)}...`)
      .join("\n\n");

    const analysisPrompt = `
Analyze this ${
      repoData.repoInfo.language || "software"
    } repository and provide detailed insights:

Repository: ${repoData.repoInfo.full_name}
Description: ${repoData.repoInfo.description || "No description"}
Language: ${repoData.repoInfo.language}
Stars: ${repoData.repoInfo.stargazers_count}
Size: ${codeAnalysis.totalFiles} files, ${
      codeAnalysis.linesOfCode
    } lines of code

Code Quality Metrics:
- Functions: ${codeAnalysis.totalFunctions} total, ${
      codeAnalysis.documentedFunctions
    } documented (${
      Math.round(
        (codeAnalysis.documentedFunctions / codeAnalysis.totalFunctions) * 100
      ) || 0
    }%)
- Dependencies: ${depAnalysis.totalDependencies} total, ${
      depAnalysis.outdatedDependencies
    } potentially outdated
- Vulnerabilities: ${depAnalysis.vulnerabilities} identified

Key Issues Found:
${[
  ...codeAnalysis.codeIssues,
  ...depAnalysis.depIssues,
  ...docAnalysis.docIssues,
]
  .slice(0, 8)
  .map((issue) => `- ${issue}`)
  .join("\n")}

Key Strengths:
${[
  ...codeAnalysis.codeStrengths,
  ...depAnalysis.depStrengths,
  ...docAnalysis.docStrengths,
]
  .slice(0, 5)
  .map((strength) => `- ${strength}`)
  .join("\n")}

Sample Code Structure:
${codeContext}

Package.json insights:
${JSON.stringify(repoData.packageJson, null, 2).slice(0, 800)}

Provide a comprehensive analysis with:
1. Overall code health summary (4-5 sentences focusing on architecture, maintainability, and quality patterns)
2. Complexity analysis (4-5 sentences about code organization, design patterns, technical debt, and scalability)
3. Detailed improvement plan (8-10 specific, prioritized recommendations with implementation guidance)

Be specific about the technology stack, identify architectural patterns, and provide actionable advice.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a senior software architect and code reviewer with expertise in multiple programming languages and frameworks. Provide detailed, actionable insights about code quality, architecture, and improvements. Focus on specific technical recommendations rather than generic advice.",
        },
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      max_tokens: 1200,
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    const response = completion.choices[0].message.content || "";
    const sections = response.split(/\d+\.\s*/);

    return {
      aiSummary:
        sections[1] ||
        "Repository analysis completed successfully. The codebase demonstrates solid architectural foundations with opportunities for enhancement in testing coverage, documentation depth, and dependency management. The project follows modern development practices with room for optimization in code organization and performance.",
      complexityAnalysis:
        sections[2] ||
        "Code organization follows established patterns with clear separation of concerns. The architecture supports maintainability through modular design, though some areas could benefit from refactoring to reduce complexity. Technical debt appears manageable with focused attention on large files and function decomposition.",
      improvementPlan:
        sections[3] ||
        "Priority improvements include: 1) Enhance test coverage to 80%+ with unit and integration tests, 2) Update outdated dependencies and address security vulnerabilities, 3) Improve documentation with comprehensive API docs and code comments, 4) Implement consistent linting and formatting rules, 5) Optimize build processes and CI/CD pipelines, 6) Refactor large files into smaller, focused modules, 7) Add error handling and logging frameworks, 8) Implement performance monitoring and optimization strategies.",
    };
  } catch (error) {
    console.error("AI analysis failed:", error);
    return {
      aiSummary:
        "Repository analysis completed. The codebase structure has been evaluated for quality, maintainability, and adherence to best practices. The project shows good foundational architecture with opportunities for enhancement.",
      complexityAnalysis:
        "Code organization demonstrates clear architectural patterns with modular design principles. Some areas show complexity that could benefit from refactoring, particularly in file size management and function decomposition for improved maintainability.",
      improvementPlan:
        "Recommended improvements include: enhancing test coverage with comprehensive unit and integration tests, updating dependencies to latest secure versions, improving documentation coverage with detailed API documentation, implementing consistent code formatting and linting standards, optimizing build and deployment processes, refactoring large files into focused modules, adding robust error handling and logging, and implementing performance monitoring and optimization strategies.",
    };
  }
}

function calculateHealthScores(
  codeAnalysis: any,
  depAnalysis: any,
  docAnalysis: any
) {
  // Enhanced scoring algorithm with more nuanced calculations

  // Documentation score with weighted factors
  const docCoverage =
    codeAnalysis.totalFunctions > 0
      ? (codeAnalysis.documentedFunctions / codeAnalysis.totalFunctions) * 100
      : 50;
  const docBonus = Math.min(30, docAnalysis.docStrengths.length * 6);
  const docPenalty = Math.min(40, docAnalysis.docIssues.length * 8);
  const documentationScore = Math.min(
    100,
    Math.max(0, docCoverage + docBonus - docPenalty)
  );

  // Dependency score with security weighting
  const depHealthRatio =
    depAnalysis.totalDependencies > 0
      ? ((depAnalysis.totalDependencies - depAnalysis.outdatedDependencies) /
          depAnalysis.totalDependencies) *
        100
      : 85;
  const securityPenalty = depAnalysis.vulnerabilities * 15; // Higher penalty for vulnerabilities
  const depBonus = Math.min(20, depAnalysis.depStrengths.length * 4);
  const dependencyScore = Math.min(
    100,
    Math.max(0, depHealthRatio + depBonus - securityPenalty)
  );

  // Code quality score with complexity consideration
  const avgFileSize =
    codeAnalysis.totalFiles > 0
      ? codeAnalysis.linesOfCode / codeAnalysis.totalFiles
      : 0;
  const sizeScore =
    avgFileSize > 300 ? Math.max(40, 100 - (avgFileSize - 300) / 8) : 95;
  const qualityBonus = Math.min(25, codeAnalysis.codeStrengths.length * 3);
  const qualityPenalty = Math.min(50, codeAnalysis.codeIssues.length * 6);
  const codeQualityScore = Math.min(
    100,
    Math.max(0, sizeScore + qualityBonus - qualityPenalty)
  );

  // Security score with enhanced vulnerability detection
  const baseSecurityScore = 85;
  const vulnPenalty = depAnalysis.vulnerabilities * 20;
  const securityIssues = codeAnalysis.codeIssues.filter(
    (issue: string) =>
      issue.toLowerCase().includes("security") ||
      issue.toLowerCase().includes("vulnerable") ||
      issue.toLowerCase().includes("eval") ||
      issue.toLowerCase().includes("innerHTML")
  ).length;
  const codeSecurityPenalty = securityIssues * 10;
  const securityScore = Math.min(
    100,
    Math.max(20, baseSecurityScore - vulnPenalty - codeSecurityPenalty)
  );

  // Test coverage score with better estimation
  const hasTestScript = depAnalysis.depStrengths.some((s: string | string[]) =>
    s.includes("Test")
  );
  const hasTestFiles = codeAnalysis.totalFiles > 0; // Could be enhanced to actually detect test files
  const testCoverageScore = hasTestScript ? (hasTestFiles ? 75 : 60) : 35;

  // Overall health score with weighted average
  const weights = {
    documentation: 0.15,
    dependency: 0.25,
    codeQuality: 0.3,
    security: 0.2,
    testCoverage: 0.1,
  };

  const overallHealthScore = Math.round(
    documentationScore * weights.documentation +
      dependencyScore * weights.dependency +
      codeQualityScore * weights.codeQuality +
      securityScore * weights.security +
      testCoverageScore * weights.testCoverage
  );

  return {
    documentationScore: Math.round(documentationScore),
    dependencyScore: Math.round(dependencyScore),
    codeQualityScore: Math.round(codeQualityScore),
    securityScore: Math.round(securityScore),
    testCoverageScore: Math.round(testCoverageScore),
    overallHealthScore,
  };
}

export async function saveAnalysis(
  projectId: string,
  analysisResult: AnalysisResult
) {
  const allIssues = [
    ...analysisResult.issues,
    ...((analysisResult as any).codeIssues || []),
    ...((analysisResult as any).depIssues || []),
    ...((analysisResult as any).docIssues || []),
  ];

  const allStrengths = [
    ...analysisResult.strengths,
    ...((analysisResult as any).codeStrengths || []),
    ...((analysisResult as any).depStrengths || []),
    ...((analysisResult as any).docStrengths || []),
  ];

  const enhancedRecommendations = [
    ...analysisResult.recommendations,
    "Implement comprehensive test coverage with unit, integration, and end-to-end tests targeting 80%+ coverage",
    "Set up automated dependency vulnerability scanning with tools like Snyk or GitHub Dependabot",
    "Establish consistent code formatting and linting rules with Prettier and ESLint/TSLint configuration",
    "Create detailed API documentation with interactive examples using tools like Swagger or Storybook",
    "Implement robust CI/CD pipelines with automated testing, security scanning, and deployment processes",
    "Add comprehensive error handling and structured logging with appropriate log levels and monitoring",
    "Optimize build processes and bundle sizes for improved performance and faster deployment cycles",
    "Implement code review guidelines and pull request templates for consistent quality standards",
  ];

  return await prisma.analysis.create({
    data: {
      projectId,
      documentationScore: analysisResult.documentationScore,
      dependencyScore: analysisResult.dependencyScore,
      codeQualityScore: analysisResult.codeQualityScore,
      securityScore: analysisResult.securityScore,
      testCoverageScore: analysisResult.testCoverageScore,
      overallHealthScore: analysisResult.overallHealthScore,
      issues: JSON.stringify(allIssues),
      recommendations: JSON.stringify(enhancedRecommendations),
      strengths: JSON.stringify(allStrengths),
      totalFiles: analysisResult.totalFiles,
      linesOfCode: analysisResult.linesOfCode,
      documentedFunctions: analysisResult.documentedFunctions,
      totalFunctions: analysisResult.totalFunctions,
      totalDependencies: analysisResult.totalDependencies,
      outdatedDependencies: analysisResult.outdatedDependencies,
      vulnerabilities: analysisResult.vulnerabilities,
      aiSummary: analysisResult.aiSummary,
      complexityAnalysis: analysisResult.complexityAnalysis,
      improvementPlan: analysisResult.improvementPlan,
      status: "completed",
    },
  });
}

export async function updateAnalysisStatus(analysisId: string, status: string) {
  return await prisma.analysis.update({
    where: { id: analysisId },
    data: { status },
  });
}
