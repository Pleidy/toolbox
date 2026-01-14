import fs from 'fs';
import path from 'path';

const distPath = path.join(process.cwd(), 'dist', 'index.html');
const html = fs.readFileSync(distPath, 'utf-8');
const fixedHtml = html
  .replace(/src="\/assets\//g, 'src="./assets/')
  .replace(/href="\/assets\//g, 'href="./assets/')
  .replace(/href="\/vite.svg"/g, 'href="./vite.svg"');
fs.writeFileSync(distPath, fixedHtml);
console.log('Fixed asset paths in index.html');
