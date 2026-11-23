/// <reference lib="webworker" />
import { SCRIPT_PROTOCOL_VERSION, type ScriptWorkerRequest, type ScriptWorkerResponse } from './protocol'
import { runScriptSandbox } from './sandbox'

const scope = self as unknown as DedicatedWorkerGlobalScope

scope.addEventListener('message', (event: MessageEvent<ScriptWorkerRequest>) => {
  const request = event.data
  if (request.protocolVersion !== SCRIPT_PROTOCOL_VERSION) {
    return
  }
  void runScriptSandbox(request.input)
    .then((result) => {
      const response: ScriptWorkerResponse = {
        protocolVersion: SCRIPT_PROTOCOL_VERSION,
        id: request.id,
        result,
      }
      scope.postMessage(response)
    })
    .catch((error: unknown) => {
      const response: ScriptWorkerResponse = {
        protocolVersion: SCRIPT_PROTOCOL_VERSION,
        id: request.id,
        result: {
          ok: false,
          code: 'sandbox-crash',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? (error.stack ?? null) : null,
          logs: [],
          durationMs: 0,
        },
      }
      scope.postMessage(response)
    })
})