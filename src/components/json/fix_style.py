import re

with open("JsonFormatter.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_style = """      <style>{\`
        /* 全局覆盖所有可能的斜体样式 */
        .react-json-view,
        .react-json-view *,
        .react-json-view *::before,
        .react-json-view *::after {
          font-style: normal !important;
        }
        
        /* 强制覆盖所有字体样式 */
        .react-json-view span {
          font-style: normal !important;
        }
        
        /* 覆盖所有可能的应用了斜体的元素 */
        .react-json-view .value,
        .react-json-view .string,
        .react-json-view .number,
        .react-json-view .boolean,
        .react-json-view .null,
        .react-json-view .key {
          font-style: normal !important;
        }
        
        /* 覆盖所有子元素 */
        .react-json-view > div > span,
        .react-json-view > div > div {
          font-style: normal !important;
        }
        
        /* 覆盖深层嵌套元素 */
        .react-json-view span span,
        .react-json-view span div {
          font-style: normal !important;
        }
        
        /* 确保所有文本节点都是正常样式 */
        .react-json-view .rjv-value,
        .react-json-view .rjv-key,
        .react-json-view .rjv-string {
          font-style: normal !important;
        }
      \`}</style>"""

new_style = """      <style>{\`
        /* JSON引号斜体修复 - 最高优先级 */
        .react-json-view,
        .react-json-view *,
        .react-json-view *:before,
        .react-json-view *:after,
        .react-json-view span,
        .react-json-view div,
        .react-json-view label {
          font-style: normal !important;
          all: normal !important;
        }
        
        .react-json-view span *,
        .react-json-view div *,
        .react-json-view span span {
          font-style: normal !important;
          all: normal !important;
        }
        
        [style*="italic"] {
          font-style: normal !important;
        }
        
        .wmde-markdown-color .react-json-view * {
          font-style: normal !important;
        }
      \`}</style>"""

content = content.replace(old_style, new_style)

with open("JsonFormatter.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("修复完成")
