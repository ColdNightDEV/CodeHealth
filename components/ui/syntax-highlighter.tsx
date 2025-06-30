"use client";

import { useState } from "react";
import { Copy, Maximize2, Minimize2, Check } from "lucide-react";
import { Button } from "./button";

interface SyntaxHighlighterProps {
  code: string;
  language: string;
  className?: string;
  showLineNumbers?: boolean;
}

export function SyntaxHighlighter({
  code,
  language,
  className = "",
  showLineNumbers = true,
}: SyntaxHighlighterProps) {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const lines = code.split("\n");

  const getTokens = (line: string, lang: string) => {
    const tokens: Array<{ type: string; content: string }> = [];

    // Clean the line of any existing HTML-like artifacts
    const cleanLine = line
      .replace(/text-purple-[^>]*>/g, "")
      .replace(/[0-9]+[">]/g, "");

    switch (lang.toLowerCase()) {
      case "python":
        return tokenizePython(cleanLine);
      case "javascript":
      case "typescript":
      case "jsx":
      case "tsx":
        return tokenizeJavaScript(cleanLine);
      case "json":
        return tokenizeJSON(cleanLine);
      case "css":
        return tokenizeCSS(cleanLine);
      case "html":
        return tokenizeHTML(cleanLine);
      case "markdown":
      case "md":
        return tokenizeMarkdown(cleanLine);
      default:
        return [{ type: "text", content: cleanLine }];
    }
  };

  const tokenizePython = (line: string) => {
    const tokens: Array<{ type: string; content: string }> = [];
    const pythonKeywords = [
      "def",
      "class",
      "if",
      "elif",
      "else",
      "for",
      "while",
      "try",
      "except",
      "finally",
      "import",
      "from",
      "as",
      "return",
      "yield",
      "break",
      "continue",
      "pass",
      "lambda",
      "with",
      "assert",
      "del",
      "global",
      "nonlocal",
      "True",
      "False",
      "None",
      "and",
      "or",
      "not",
      "in",
      "is",
      "async",
      "await",
    ];

    // Handle comments
    if (line.trim().startsWith("#")) {
      tokens.push({ type: "comment", content: line });
      return tokens;
    }

    // Handle strings
    const stringRegex = /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g;
    let lastIndex = 0;
    let match;

    while ((match = stringRegex.exec(line)) !== null) {
      // Add text before string
      if (match.index > lastIndex) {
        const beforeString = line.slice(lastIndex, match.index);
        tokens.push(...tokenizeText(beforeString, pythonKeywords));
      }

      // Add string
      tokens.push({ type: "string", content: match[0] });
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < line.length) {
      const remaining = line.slice(lastIndex);
      tokens.push(...tokenizeText(remaining, pythonKeywords));
    }

    return tokens.length > 0 ? tokens : [{ type: "text", content: line }];
  };

  const tokenizeJavaScript = (line: string) => {
    const tokens: Array<{ type: string; content: string }> = [];
    const jsKeywords = [
      "const",
      "let",
      "var",
      "function",
      "class",
      "if",
      "else",
      "for",
      "while",
      "do",
      "switch",
      "case",
      "default",
      "break",
      "continue",
      "return",
      "try",
      "catch",
      "finally",
      "throw",
      "new",
      "this",
      "super",
      "extends",
      "import",
      "export",
      "from",
      "as",
      "default",
      "async",
      "await",
      "true",
      "false",
      "null",
      "undefined",
    ];

    // Handle comments
    if (line.trim().startsWith("//")) {
      tokens.push({ type: "comment", content: line });
      return tokens;
    }

    // Handle strings
    const stringRegex = /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g;
    let lastIndex = 0;
    let match;

    while ((match = stringRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        const beforeString = line.slice(lastIndex, match.index);
        tokens.push(...tokenizeText(beforeString, jsKeywords));
      }

      tokens.push({ type: "string", content: match[0] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      const remaining = line.slice(lastIndex);
      tokens.push(...tokenizeText(remaining, jsKeywords));
    }

    return tokens.length > 0 ? tokens : [{ type: "text", content: line }];
  };

  const tokenizeJSON = (line: string) => {
    const tokens: Array<{ type: string; content: string }> = [];

    // JSON string values
    const stringRegex = /"([^"\\]|\\.)*"/g;
    let lastIndex = 0;
    let match;

    while ((match = stringRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        const before = line.slice(lastIndex, match.index);
        tokens.push({ type: "text", content: before });
      }

      // Check if it's a key or value
      const beforeMatch = line.slice(0, match.index).trim();
      const isKey = beforeMatch.endsWith("{") || beforeMatch.endsWith(",");

      tokens.push({
        type: isKey ? "property" : "string",
        content: match[0],
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      const remaining = line.slice(lastIndex);
      // Highlight numbers and booleans
      const processed = remaining
        .replace(
          /\b(true|false|null)\b/g,
          '<span class="text-blue-400">$1</span>'
        )
        .replace(/\b\d+(\.\d+)?\b/g, '<span class="text-orange-400">$1</span>');

      tokens.push({ type: "text", content: processed });
    }

    return tokens.length > 0 ? tokens : [{ type: "text", content: line }];
  };

  const tokenizeCSS = (line: string) => {
    const tokens: Array<{ type: string; content: string }> = [];

    // CSS selectors, properties, and values
    if (line.includes(":") && !line.trim().startsWith("/*")) {
      const [property, ...valueParts] = line.split(":");
      tokens.push({ type: "property", content: property + ":" });
      if (valueParts.length > 0) {
        tokens.push({ type: "string", content: valueParts.join(":") });
      }
    } else {
      tokens.push({ type: "text", content: line });
    }

    return tokens;
  };

  const tokenizeHTML = (line: string) => {
    const tokens: Array<{ type: string; content: string }> = [];

    // HTML tags
    const tagRegex = /<\/?[^>]+>/g;
    let lastIndex = 0;
    let match;

    while ((match = tagRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          type: "text",
          content: line.slice(lastIndex, match.index),
        });
      }

      tokens.push({ type: "tag", content: match[0] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      tokens.push({ type: "text", content: line.slice(lastIndex) });
    }

    return tokens.length > 0 ? tokens : [{ type: "text", content: line }];
  };

  const tokenizeMarkdown = (line: string) => {
    const tokens: Array<{ type: string; content: string }> = [];

    if (line.startsWith("#")) {
      tokens.push({ type: "keyword", content: line });
    } else if (line.startsWith("```")) {
      tokens.push({ type: "comment", content: line });
    } else if (line.includes("**") || line.includes("*")) {
      tokens.push({ type: "string", content: line });
    } else {
      tokens.push({ type: "text", content: line });
    }

    return tokens;
  };

  const tokenizeText = (text: string, keywords: string[]) => {
    const tokens: Array<{ type: string; content: string }> = [];
    const words = text.split(/(\s+|[^\w\s])/);

    for (const word of words) {
      if (keywords.includes(word)) {
        tokens.push({ type: "keyword", content: word });
      } else if (/^\d+$/.test(word)) {
        tokens.push({ type: "number", content: word });
      } else {
        tokens.push({ type: "text", content: word });
      }
    }

    return tokens;
  };

  const getTokenColor = (type: string) => {
    switch (type) {
      case "keyword":
        return "text-purple-400";
      case "string":
        return "text-green-400";
      case "comment":
        return "text-gray-500";
      case "number":
        return "text-orange-400";
      case "property":
        return "text-blue-400";
      case "tag":
        return "text-red-400";
      default:
        return "text-slate-300";
    }
  };

  return (
    <div
      className={`relative ${
        isFullscreen ? "fixed inset-0 z-50 bg-slate-900" : ""
      } ${className}`}
    >
      <div className="flex items-center justify-between p-3 bg-slate-800 border-b border-slate-700">
        <span className="text-sm text-slate-400 font-mono">{language}</span>
        <div className="flex items-center space-x-2">
          <Button
            onClick={copyToClipboard}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            onClick={() => setIsFullscreen(!isFullscreen)}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div
        className={`overflow-auto ${
          isFullscreen ? "h-full" : "max-h-96"
        } bg-slate-900`}
      >
        <div className="p-4">
          <pre className="text-sm font-mono">
            {lines.map((line, lineIndex) => (
              <div key={lineIndex} className="flex">
                {showLineNumbers && (
                  <span className="text-slate-500 text-right pr-4 select-none w-12 flex-shrink-0">
                    {lineIndex + 1}
                  </span>
                )}
                <code className="flex-1">
                  {getTokens(line, language).map((token, tokenIndex) => (
                    <span
                      key={tokenIndex}
                      className={getTokenColor(token.type)}
                      dangerouslySetInnerHTML={{ __html: token.content }}
                    />
                  ))}
                  {line === "" && "\n"}
                </code>
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}
