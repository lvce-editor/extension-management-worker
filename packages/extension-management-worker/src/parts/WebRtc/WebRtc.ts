import { RendererWorker } from '@lvce-editor/rpc-registry'

export interface StartWebRpcAudioStreamOptions {
  readonly elementLocator: string
  readonly ephemeralKey: string
  readonly uid: number
}

export const startWebRtcAudioStream = async (options: StartWebRpcAudioStreamOptions): Promise<string> => {
  return await RendererWorker.invoke('WebView.compatRendererProcessInvoke', 'WebRtc.startWebRtcAudioStream', options)
}

export interface SetRemoteDescriptionOptions {
  readonly sdp: string
  readonly type: 'answer'
  readonly uid: number
}

export const setRemoteDescription = async (options: SetRemoteDescriptionOptions): Promise<void> => {
  await RendererWorker.invoke('WebView.compatRendererProcessInvoke', 'WebRtc.setRemoteDescription', options)
}
