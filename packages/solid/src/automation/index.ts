export {
  App,
  AutomationError,
  InProcessAutomationBackend,
  Locator,
  createTestApp,
} from "../automation.js"
export type {
  AutomationBackend,
  AutomationErrorCode,
  AutomationTreeNode,
  ElementBounds,
} from "../automation.js"

export {
  LiveAutomationBackend,
  enableAutomation,
  handleAutomationRequest,
  serveAutomationStdio,
} from "./server.js"
export type { LiveAutomationRenderer } from "./server.js"

export {
  SseAutomationBackend,
  connectStdio,
  launch,
} from "./stdio.js"

export {
  PROTOCOL_VERSION,
  automationErrorCodes,
  automationRequestSchema,
  createSseDecoder,
  encodeSse,
  parseWireMessage,
} from "./protocol.js"
export type {
  AutomationMethod,
  AutomationRequest,
  AutomationResponse,
  SseDecoder,
  WireMessage,
} from "./protocol.js"
