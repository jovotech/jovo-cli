export interface GoogleActionProjectLocales {
  [modelLocale: string]: string | string[];
}

export interface GoogleActionActions {
  custom: {
    [key: string]: object;
  };
}
