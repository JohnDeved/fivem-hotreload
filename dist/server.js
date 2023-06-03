"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/server.ts
var import_promises = __toESM(require("fs/promises"));
var import_child_process = require("child_process");
getAllResources().then((resources) => {
  for (const resource of resources) {
    if (resource.name === GetCurrentResourceName())
      continue;
    console.log(`[hotreload] Watching ${resource.name} with command: ${resource.watchCommand}`);
    const watchProcess = (0, import_child_process.spawn)(resource.watchCommand, { shell: true, cwd: resource.path });
    watchProcess.stdout.on("data", (data) => console.log(`[hotreload][${resource.name}][stdout] ${data.toString()}`));
    watchProcess.stderr.on("data", (data) => console.log(`[hotreload][${resource.name}][stderr] ${data.toString()}`));
    watchProcess.stdout.on("data", (data) => restartResource(resource.name, data));
    watchProcess.on("close", (code) => console.log(`[hotreload][${resource.name}] Watch process exited with code ${code}`));
  }
});
function restartResource(resourceName, out) {
  if (!out.includes("Rebuild succeeded"))
    return;
  ExecuteCommand(`ensure ${resourceName}`);
}
async function getAllResources() {
  const numResources = GetNumResources();
  const resourceNames = [];
  for (let i = 0; i < numResources; i++) {
    const resourceName = GetResourceByFindIndex(i);
    const resourcePath = GetResourcePath(resourceName);
    const manifest = await import_promises.default.readFile(`${resourcePath}/fxmanifest.lua`, "utf-8").catch(() => null);
    if (!manifest)
      continue;
    if (!manifest.includes("fxdk_watch_command"))
      continue;
    const match = manifest.match(/fxdk_watch_command\s+'(.+?)'\s+{(.+?)}/);
    if (!match)
      continue;
    const [, command, args] = match;
    const commandArgs = args.split(",").map((arg) => arg.trim().replace(/'/g, "")).join(" ");
    const commandString = `${command} ${commandArgs}`;
    resourceNames.push({
      name: resourceName,
      path: resourcePath,
      watchCommand: commandString
    });
  }
  return resourceNames;
}
