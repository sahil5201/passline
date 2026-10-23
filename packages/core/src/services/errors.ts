export class ServiceError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.name = "ServiceError"
    this.code = code
    this.status = status
  }
}

export function assertUserId(userId: string): void {
  if (!userId || typeof userId !== "string") {
    throw new ServiceError("UNAUTHORIZED", "user_id is required", 401)
  }
}
