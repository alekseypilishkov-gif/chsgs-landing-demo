import { initDebug } from '../debugDock';
import { number } from './html';
import { landingMarkup } from './markup';
import { initMenu } from './menu';
import { initTheme } from './theme';
import { initVideo } from './video';
import { initClients } from './clients';
import '../siteChrome.css';

export function mountLanding(): void {
  document.querySelector('#app')!.innerHTML = landingMarkup();
  initTheme(); initMenu(); initClients(); initVideo(); initDebug();
}

export { number as formatMetric };
