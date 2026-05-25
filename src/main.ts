import * as THREE from 'three';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

/** three-globe reads window.THREE at module load — must be set before any lazy chunk imports it. */
(window as unknown as { THREE: typeof THREE }).THREE = THREE;

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
