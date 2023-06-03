import fsp from 'fs/promises'
import { spawn } from 'child_process'
import config from '../config.json'

interface IResource {
  name: string
  path: string
  watchCommand: string
}

getAllResources().then(resources => {
  for (const resource of resources) {
    if (resource.name === GetCurrentResourceName()) continue
    console.log(`[hotreload] Watching ${resource.name} with command: ${resource.watchCommand}`)

    const watchProcess = spawn(resource.watchCommand, { shell: true, cwd: resource.path })
    watchProcess.stdout.on('data', data => console.log(`[hotreload][${resource.name}][stdout] ${data.toString()}`))
    watchProcess.stderr.on('data', data => console.log(`[hotreload][${resource.name}][stderr] ${data.toString()}`))
    watchProcess.stdout.on('data', data => restartResource(resource.name, data))
    watchProcess.on('close', code => console.log(`[hotreload][${resource.name}] Watch process exited with code ${code}`))
  }
})

function restartResource (resourceName: string, out: string) {
  if (config.ensureTriggers.some(trigger => out.includes(trigger))) {
    ExecuteCommand(`ensure ${resourceName}`)
  }
}

async function getAllResources () {
  const numResources = GetNumResources()
  const resourceNames: IResource[] = []
  for (let i = 0; i < numResources; i++) {
    const resourceName = GetResourceByFindIndex(i)
    const resourcePath = GetResourcePath(resourceName)

    const manifest = await fsp.readFile(`${resourcePath}/fxmanifest.lua`, 'utf-8').catch(() => null)

    if (!manifest) continue
    if (!manifest.includes('fxdk_watch_command')) continue

    const match = manifest.match(/fxdk_watch_command\s+'(.+?)'\s+{(.+?)}/)
    if (!match) continue

    const [, command, args] = match
    const commandArgs = args.split(',').map(arg => arg.trim().replace(/'/g, '')).join(' ')
    const commandString = `${command} ${commandArgs}`

    resourceNames.push({
      name: resourceName,
      path: resourcePath,
      watchCommand: commandString,
    })
  }

  return resourceNames
}
