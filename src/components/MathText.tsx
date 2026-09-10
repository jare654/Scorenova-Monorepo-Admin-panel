import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathTextProps {
  text: string;
  className?: string;
}

export const MathText: React.FC<MathTextProps> = ({ text, className = "" }) => {
  if (!text) return null;
  if (typeof text !== "string") {
    return <span className={className}>{String(text)}</span>;
  }

  // Render segments
  const renderContent = () => {
    try {
      // Regex for block math ($$...$$ or \[...\]) and inline math ($...$ or \(...\))
      const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([^\)]+?\\\))/g;
      const parts = text.split(regex);

      return parts.map((part, index) => {
        if (!part) return null;

        let isBlock = false;
        let math = "";

        if (part.startsWith("$$") && part.endsWith("$$")) {
          isBlock = true;
          math = part.slice(2, -2).trim();
        } else if (part.startsWith("\\[") && part.endsWith("\\]")) {
          isBlock = true;
          math = part.slice(2, -2).trim();
        } else if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          math = part.slice(1, -1).trim();
        } else if (part.startsWith("\\(") && part.endsWith("\\)")) {
          math = part.slice(2, -2).trim();
        } else {
          // Plain text
          return <span key={index}>{part}</span>;
        }

        try {
          const html = katex.renderToString(math, {
            displayMode: isBlock,
            throwOnError: false,
          });
          return (
            <span
              key={index}
              dangerouslySetInnerHTML={{ __html: html }}
              className={isBlock ? "block my-2" : "inline-block"}
            />
          );
        } catch {
          return <span key={index}>{part}</span>;
        }
      });
    } catch {
      return <span>{text}</span>;
    }
  };

  return <span className={className}>{renderContent()}</span>;
};
