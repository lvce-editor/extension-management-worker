/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

import { getOrigin } from '../GetOrigin/GetOrigin.ts'

const allowedScriptSources = new Set([`'self'`, `'unsafe-eval'`])
const reservedDirectives = new Set(['child-src', 'connect-src', 'default-src', 'script-src', 'worker-src'])
const nodeProcessType = 'node-process'

interface RpcInfo {
  readonly type?: unknown
}

const parseDirective = (directive: string): readonly string[] => {
  if (directive.includes('\n') || directive.includes('\r')) {
    throw new Error('content security policy directives cannot contain newlines')
  }
  return directive.replace(/;$/, '').trim().split(/\s+/)
}

const getWorkerUrls = (
  absolutePath: string,
): { readonly assetSource?: string; readonly capabilitySource?: string; readonly nodeProcessSource?: string; readonly origin: string } => {
  const applicationUrl = new URL(getOrigin())
  const workerUrl = new URL(absolutePath, applicationUrl)
  if (workerUrl.protocol !== 'http:' && workerUrl.protocol !== 'https:') {
    return { origin: applicationUrl.origin }
  }
  const webSocketProtocol = applicationUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  return {
    assetSource: new URL('./', workerUrl).href,
    capabilitySource: `${webSocketProtocol}//${applicationUrl.host}/websocket/capability`,
    nodeProcessSource: `${webSocketProtocol}//${applicationUrl.host}/websocket/extension-node-process`,
    origin: applicationUrl.origin,
  }
}

const hasNodeProcess = (rpcInfos: readonly unknown[] | undefined): boolean => {
  return rpcInfos?.some((rpcInfo) => typeof rpcInfo === 'object' && rpcInfo !== null && (rpcInfo as RpcInfo).type === nodeProcessType) === true
}

const validateExternalConnectSource = (source: string, applicationOrigin: string): string => {
  if (source.includes('*') || source === `'none'`) {
    throw new Error(`invalid isolated extension connect source ${source}`)
  }
  let url: URL
  try {
    url = new URL(source)
  } catch {
    throw new Error(`isolated extension connect source must be an absolute URL. Invalid value: ${JSON.stringify(source)}`)
  }
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
    throw new Error(`invalid isolated extension connect source ${source}`)
  }
  const applicationUrl = new URL(applicationOrigin)
  if (url.host === applicationUrl.host) {
    throw new Error(`isolated extensions cannot allow the application origin in connect-src`)
  }
  return source
}

const addScriptSources = (scriptSources: Set<string>, sources: readonly string[]): void => {
  for (const source of sources) {
    if (!allowedScriptSources.has(source)) {
      throw new Error(`invalid isolated extension script source ${source}`)
    }
    scriptSources.add(source)
  }
}

const addConnectSources = (connectSources: Set<string>, sources: readonly string[], assetSource: string | undefined, origin: string): void => {
  for (const source of sources) {
    if (source === `'self'`) {
      if (assetSource) {
        connectSources.add(assetSource)
      }
    } else {
      connectSources.add(validateExternalConnectSource(source, origin))
    }
  }
}

const validateDefaultSources = (sources: readonly string[]): void => {
  if (sources.length !== 1 || sources[0] !== `'none'`) {
    throw new Error(`isolated extension default-src must be 'none'`)
  }
}

const applyDirective = (
  directive: string,
  scriptSources: Set<string>,
  connectSources: Set<string>,
  assetSource: string | undefined,
  origin: string,
): void => {
  const [name, ...sources] = parseDirective(directive)
  if (!name) {
    return
  }
  if (name === 'default-src') {
    validateDefaultSources(sources)
    return
  }
  if (name === 'script-src') {
    addScriptSources(scriptSources, sources)
    return
  }
  if (name === 'connect-src') {
    addConnectSources(connectSources, sources, assetSource, origin)
    return
  }
  if (reservedDirectives.has(name)) {
    throw new Error(`isolated extensions cannot override ${name}`)
  }
}

export const getContentSecurityPolicy = (directives: readonly string[] | undefined, absolutePath: string, rpcInfos?: readonly unknown[]): string => {
  const { assetSource, capabilitySource, nodeProcessSource, origin } = getWorkerUrls(absolutePath)
  const scriptSources = new Set([`'self'`])
  const connectSources = new Set<string>()
  if (capabilitySource) {
    connectSources.add(capabilitySource)
  }
  if (assetSource) {
    connectSources.add(assetSource)
  }
  if (nodeProcessSource && hasNodeProcess(rpcInfos)) {
    connectSources.add(nodeProcessSource)
  }

  const manifestDirectives = directives || []
  for (const directive of manifestDirectives) {
    applyDirective(directive, scriptSources, connectSources, assetSource, origin)
  }

  const connectDirective = connectSources.size > 0 ? [...connectSources].join(' ') : `'none'`
  return `default-src 'none'; script-src ${[...scriptSources].join(' ')}; worker-src 'none'; child-src 'none'; connect-src ${connectDirective};`
}
