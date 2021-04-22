import Command from '@oclif/command';
import * as Parser from '@oclif/parser';
import { Mixin } from 'ts-mixer';

import { PluginComponent } from './PluginComponent';
import { Emitter } from './EventEmitter';
import { JovoCliError } from './JovoCliError';
import { ActionSet, DefaultEvents, Events } from './utils/Interfaces';

/**
 * Extends abstract Oclif Command class to mixin with PluginCommand.
 * * Workaround, since mixin() can't support abstract classes.
 */
class OclifCommand extends Command {
  run(): PromiseLike<unknown> {
    throw new Error('Method not implemented.');
  }
}

export abstract class PluginCommand<T extends Events = DefaultEvents> extends Mixin(
  PluginComponent,
  OclifCommand,
) {
  protected actionSet!: ActionSet<T | DefaultEvents>;
  protected $emitter!: Emitter<T | DefaultEvents>;

  static args: Parser.args.Input;

  /**
   * Loads command into CLI.
   * * Necessary for Oclif Framework.
   */
  static load(): typeof PluginCommand {
    return this;
  }

  /**
   * Declare run() as abstract again.
   */
  abstract run(): Promise<unknown>;

  /**
   * Catch possible errors and print them.
   * @param error - JovoCliError.
   */
  async catch(error: JovoCliError): Promise<void> {
    this.error(`There was a problem:\n${error}`);
  }
}
