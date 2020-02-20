import { AppFile, JovoTaskContext } from 'jovo-cli-core';

export interface AppFileDialogFlow extends AppFile {
  googleAction?: {
    nlu?: {
      name: string;
    };
  };
}

export interface JovoTaskContextGoogle extends JovoTaskContext {
  pathToZip: string;
  keyFile: string;
}
