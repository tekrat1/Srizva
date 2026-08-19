import type { FileSystemTree } from "@webcontainer/api";
import type { VirtualFS } from "@/lib/agent/types";

// Tiny zero-dependency static file server, injected only when the
// generated project has no package.json (i.e. plain HTML/CSS/JS).
// WebContainers is a Node.js runtime, so even static files need
// *something* listening on a port to be previewable.
const STATIC_SERVER = `
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const mime = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".ico": "image/x-icon",
};

http.createServer((req, res) => {
  let filePath = path.join(root, req.url === "/" ? "/index.html" : req.url.split("?")[0]);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    res.end(data);
  });
}).listen(3000, () => console.log("listening on 3000"));
`;

export function buildFileSystemTree(files: VirtualFS): {
  tree: FileSystemTree;
  hasPackageJson: boolean;
  runCommand: { cmd: string; args: string[] };
} {
  const hasPackageJson = Object.keys(files).some((p) => p.endsWith("package.json"));
  const tree: FileSystemTree = {};

  for (const [filePath, content] of Object.entries(files)) {
    const parts = filePath.split("/").filter(Boolean);
    let cursor = tree;

    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i];
      if (!cursor[dir] || !("directory" in cursor[dir])) {
        cursor[dir] = { directory: {} };
      }
      cursor = (cursor[dir] as { directory: FileSystemTree }).directory;
    }

    cursor[parts[parts.length - 1]] = { file: { contents: content } };
  }

  if (!hasPackageJson) {
    tree["server.mjs"] = { file: { contents: STATIC_SERVER } };
  }

  return {
    tree,
    hasPackageJson,
    runCommand: hasPackageJson
      ? { cmd: "npm", args: ["run", "dev"] }
      : { cmd: "node", args: ["server.mjs"] },
  };
}
