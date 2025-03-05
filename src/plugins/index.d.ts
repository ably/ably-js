import Objects from './liveobjects';
import Push from './push';

export interface StandardPlugins {
  Objects?: typeof Objects;
  Push?: typeof Push;
}
