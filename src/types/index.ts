export type RequiredNotNull<T> = Required<
  {
    [P in keyof T]: NonNullable<T[P]>;
  }
>;
