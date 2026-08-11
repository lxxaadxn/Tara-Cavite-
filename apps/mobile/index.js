import 'react-native-url-polyfill/auto';
import './lib/polyfillCrypto';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
