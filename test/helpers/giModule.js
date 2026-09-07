import { readFileSync } from "node:fs";

// Substitute only imports unavailable in Node; execute the production module body.
export function loadGiModule(url, bindings, exports) {
  const source = readFileSync(url, "utf8")
    .replace(/import[\s\S]*?from\s+"[^"]+";/g, "")
    .replace(/export\s*\{[^}]*\}\s*from\s*"[^"]+";/g, "")
    .replace(/export /g, "");
  return new Function(...Object.keys(bindings), `${source}\nreturn {${exports}};`)(
    ...Object.values(bindings),
  );
}
