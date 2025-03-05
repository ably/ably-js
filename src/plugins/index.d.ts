import Objects from './objects';
import Push from './push';

export interface StandardPlugins {
  Objects?: typeof Objects;
  Push?: typeof Push;
}
