// index.js (root)
import { registerRootComponent } from 'expo';
import App from './src/App';

// If you’re using gesture-handler, ensure it's the FIRST import in src/App.tsx:
// import 'react-native-gesture-handler';

// --- RN DOM shim for three.js ---
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
  global.window = global; // some libs expect window to exist
}


registerRootComponent(App);
