/** User-facing command error: message is shown to the invoker as an ephemeral reply. */
export class CommandError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'COMMAND_ERROR',
  ) {
    super(message);
    this.name = 'CommandError';
  }
}

export class PermissionDeniedError extends CommandError {
  constructor(message = '你沒有權限執行這個指令。') {
    super(message, 'PERMISSION_DENIED');
  }
}

export class CooldownError extends CommandError {
  constructor(public readonly retryAfterMs: number) {
    super(`指令冷卻中，請於 ${Math.ceil(retryAfterMs / 1000)} 秒後再試。`, 'COOLDOWN');
  }
}
