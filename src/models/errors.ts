export type ParseError = {
  readonly kind: 'parse';
  readonly message: string;
  readonly position: number;
};

export type ImportError = {
  readonly kind: 'import';
  readonly message: string;
  readonly cause?: Error;
};

export type DbError = {
  readonly kind: 'db';
  readonly message: string;
  readonly cause?: Error;
};

export type AppError = ParseError | ImportError | DbError;
