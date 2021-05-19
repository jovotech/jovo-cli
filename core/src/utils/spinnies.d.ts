declare module 'spinnies' {
  class Spinnies {
    constructor(options?: {
      spinnerColor?: string;
      succeedColor?: string;
      failColor?: string;
      failPrefix?: string;
    });

    add(name: string, options?: {}): unknown;
    succeed(name: string, options?: {}): unknown;
    fail(name: string, options?: {}): unknown;
    pick(name: string): { status: string; succeedColor: string };
  }

  export = Spinnies;
}
