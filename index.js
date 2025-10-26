import { registerRootComponent } from 'expo';
import App from './src/App';

if (typeof global.document === 'undefined') {
  global.document = {
    createElementNS: (_ns, name) => {
      if (name === 'canvas') {
        const canvas = {
          width: 1,
          height: 1,
          style: {},
          addEventListener: () => {},
          removeEventListener: () => {},
          getContext: () => null,
        };
        return canvas;
      }
      return { style: {} };
    },
  };
}
if (typeof global.window === 'undefined') {
  global.window = global;
}

registerRootComponent(App);
