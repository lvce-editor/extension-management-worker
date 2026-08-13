export interface RuntimeStatus {
  readonly activationEndTime: number
  readonly activationEvent: string
  readonly activationStartTime: number
  readonly activationTime: number
  readonly error?: string
  readonly id: string
  readonly importEndTime: number
  readonly importStartTime: number
  readonly importTime: number
  readonly memoryUsage?: number
  readonly status: number
}
