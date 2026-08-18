#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const path = "src/features/account/shell/account-studio.css";
let css = readFileSync(path, "utf8");
const archivo = (css.match(/"Archivo"/g) || []).length;
const mono = (css.match(/"Space Mono"/g) || []).length;
css = css.replaceAll('"Archivo"', "var(--font-account-archivo)");
css = css.replaceAll('"Space Mono"', "var(--font-account-mono)");
writeFileSync(path, css);
console.log(`Replaced Archivo=${archivo}, Space Mono=${mono}`);
