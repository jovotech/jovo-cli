import { Hook } from '@oclif/config';
import { Collector } from '../Collector';

const hook: Hook<'init'> = async function ({ id }) {
  const collector = new Collector(this.config);
  await collector.install(id!);
  this.config.plugins.push(collector);
};

export default hook;
