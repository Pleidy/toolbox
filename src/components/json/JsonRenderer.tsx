import React from "react";

interface JsonRendererProps {
  data: unknown;
}

export function JsonRenderer({ data }: JsonRendererProps) {
  if (data === undefined) {
    return <span className="text-gray-500">undefined</span>;
  }
  
  const jsonStr = JSON.stringify(data, null, 2);
  
  const parts: (string | React.ReactNode)[] = [];
  let i = 0;
  let expectKey = false;
  
  while (i < jsonStr.length) {
    if (jsonStr[i] === "\n") {
      parts.push("\n");
      i++;
      expectKey = false;
    } else if (jsonStr[i] === " ") {
      let spaces = "";
      while (i < jsonStr.length && jsonStr[i] === " ") {
        spaces += " ";
        i++;
      }
      parts.push(spaces);
    } else if (jsonStr[i] === "t" && jsonStr.substring(i, i + 4) === "true") {
      parts.push(<span className="text-purple-600 dark:text-purple-400">true</span>);
      i += 4;
    } else if (jsonStr[i] === "f" && jsonStr.substring(i, i + 5) === "false") {
      parts.push(<span className="text-purple-600 dark:text-purple-400">false</span>);
      i += 5;
    } else if (jsonStr[i] === "n" && jsonStr.substring(i, i + 4) === "null") {
      parts.push(<span className="text-gray-500 dark:text-gray-400">null</span>);
      i += 4;
    } else if (jsonStr[i] === "-" || !isNaN(Number(jsonStr[i]))) {
      let num = "";
      while (i < jsonStr.length && (jsonStr[i] === "-" || !isNaN(Number(jsonStr[i])) || jsonStr[i] === "." || jsonStr[i] === "e" || jsonStr[i] === "E" || jsonStr[i] === "+")) {
        num += jsonStr[i];
        i++;
      }
      parts.push(<span className="text-blue-600 dark:text-blue-400">{num}</span>);
    } else if (jsonStr[i] === "{") {
      parts.push("{");
      i++;
      expectKey = true;
    } else if (jsonStr[i] === "}") {
      parts.push("}");
      i++;
      expectKey = false;
    } else if (jsonStr[i] === "[") {
      parts.push("[");
      i++;
      expectKey = true;
    } else if (jsonStr[i] === "]") {
      parts.push("]");
      i++;
      expectKey = false;
    } else if (jsonStr[i] === ":") {
      parts.push(":");
      i++;
      expectKey = false;
    } else if (jsonStr[i] === ",") {
      parts.push(",");
      i++;
      expectKey = true;
    } else if (jsonStr[i] === "\"") {
      let str = "";
      i++;
      while (i < jsonStr.length && !(jsonStr[i] === "\"" && jsonStr[i - 1] !== "\\")) {
        str += jsonStr[i];
        i++;
      }
      i++;
      if (expectKey) {
        parts.push(<span className="text-purple-600 dark:text-purple-400">"{str}"</span>);
      } else {
        parts.push(<span className="text-green-600 dark:text-green-400">"{str}"</span>);
      }
    } else {
      i++;
    }
  }
  
  return (
    <div className="font-mono text-sm whitespace-pre-wrap break-all">
      {parts}
    </div>
  );
}

export default JsonRenderer;
