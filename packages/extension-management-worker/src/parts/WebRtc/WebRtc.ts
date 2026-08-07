import { RendererWorker } from '@lvce-editor/rpc-registry'

export interface StartWebRpcAudioStreamOptions {
  readonly elementLocator: string
  readonly ephemeralKey: string
  readonly port: MessagePort
  readonly uid: number
}

export const startWebRtcAudioStream = async (options: StartWebRpcAudioStreamOptions): Promise<string> => {
  return await RendererWorker.invokeAndTransfer('WebView.compatRendererProcessInvokeAndTransfer', 'WebRtc.startWebRtcAudioStream', options)
}

export const stopWebRtcAudioStream = async (uid: number): Promise<string> => {
  return await RendererWorker.invoke('WebView.compatRendererProcessInvoke', 'WebRtc.stopWebRtcAudioStream', uid)
}

export interface SetRemoteDescriptionOptions {
  readonly sdp: string
  readonly type: 'answer'
  readonly uid: number
}

export const setRemoteDescription = async (options: SetRemoteDescriptionOptions): Promise<void> => {
  await RendererWorker.invoke('WebView.compatRendererProcessInvoke', 'WebRtc.setRemoteDescription', options)
}

export interface MicLevelsResult {
  readonly micAnalyzerData: Uint8Array
  readonly remoteAnalyzerData: Uint8Array
}

interface ReadMicLevelOptions {
  readonly uid: number
}

export const readMicLevels = async (options: ReadMicLevelOptions): Promise<MicLevelsResult> => {
  return await RendererWorker.invoke('WebView.compatRendererProcessInvoke', 'WebRtc.readMicLevels', options)
}
