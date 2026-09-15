export class AppError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class AppBadRequestError extends Error {
  public readonly statusCode: number;
  public readonly errors: { field: string; message: string }[];

  constructor(statusCode: number, message: string, errors: { field: string; message: string }[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, AppBadRequestError.prototype);
  }
}
