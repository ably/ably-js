import { MessageAction } from './InterceptedMessagesQueue';
import { WebSocketMessageData } from './WebSocketMessageData';

// TODO proper types for the DTOs, and align them better with the internal language

export class JSONRPCRequest {
  constructor(readonly id: string) {}

  createDTO() {
    return { jsonrpc: '2.0', id: this.id };
  }
}

export class TransformInterceptedMessageJSONRPCRequest extends JSONRPCRequest {
  constructor(
    id: string,
    readonly messageID: string,
    readonly connectionID: string,
    readonly data: WebSocketMessageData,
    readonly fromClient: boolean,
  ) {
    super(id);
  }

  createDTO() {
    let dataParam: string;
    switch (this.data.type) {
      case 'binary':
        dataParam = this.data.data.toString('base64');
        break;
      case 'text':
        dataParam = this.data.data;
        break;
    }

    const params = {
      id: this.messageID,
      connectionID: this.connectionID,
      type: this.data.type,
      data: dataParam,
      fromClient: this.fromClient,
    };

    return { ...super.createDTO(), method: 'transformInterceptedMessage', params };
  }
}

export interface JSONRPCRequestDTO<T> {
  id: string;
  params: T;
}

export type InterceptionModeDTO = { mode: 'local'; pid: number } | { mode: 'proxy' };

export type StartInterceptionJSONRPCRequestDTO = JSONRPCRequestDTO<InterceptionModeDTO>;

export class StartInterceptionJSONRPCRequest extends JSONRPCRequest {
  constructor(id: string, readonly mode: InterceptionModeDTO) {
    super(id);
  }

  static fromDTO(dto: StartInterceptionJSONRPCRequestDTO) {
    return new StartInterceptionJSONRPCRequest(dto.id, dto.params);
  }
}

type JSONObject = Partial<Record<string, unknown>>;

export interface JSONRPCResponseDTO<T> {
  id: string;
  result: T;
}

type TransformInterceptedMessageJSONRPCResponseDTO = JSONRPCResponseDTO<
  { action: 'drop' } | { action: 'replace'; type: 'binary' | 'text'; data: string }
>;

export class JSONRPCResponse {
  constructor(readonly id: string, readonly errorMessage: string | null = null) {}

  createDTO() {
    const dto: Record<string, unknown> = { jsonrpc: '2.0', id: this.id };

    if (this.errorMessage !== null) {
      dto.error = { code: 1, message: this.errorMessage };
    } else {
      dto.result = {};
    }

    return dto;
  }

  static fromDTO(dto: JSONRPCResponseDTO<unknown>): JSONRPCResponse {
    // TODO when we add more methods we’ll need a way to know which method the request corresponds to, via the ID
    return TransformInterceptedMessageJSONRPCResponse.fromDTO(dto as TransformInterceptedMessageJSONRPCResponseDTO);
  }
}

export class TransformInterceptedMessageJSONRPCResponse extends JSONRPCResponse {
  constructor(id: string, readonly action: MessageAction) {
    super(id);
  }

  static fromDTO(dto: TransformInterceptedMessageJSONRPCResponseDTO) {
    let action: MessageAction;

    switch (dto.result.action) {
      case 'drop':
        action = { type: 'drop' };
        break;
      case 'replace':
        switch (dto.result.type) {
          case 'binary':
            const data = Buffer.from(dto.result.data, 'base64');
            action = { type: 'replace', data: { type: 'binary', data } };
            break;
          case 'text':
            action = { type: 'replace', data: { type: 'text', data: dto.result.data } };
            break;
        }
        break;
    }

    return new TransformInterceptedMessageJSONRPCResponse(dto.id, action);
  }
}
