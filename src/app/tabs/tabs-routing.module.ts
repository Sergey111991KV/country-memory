import { NgModule } from '@angular/core';
import { RouterModule, type Routes } from '@angular/router';

import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadChildren: () =>
          import('../home/home.module').then((m) => m.HomePageModule),
      },
      {
        path: 'play',
        loadChildren: () =>
          import('../play/play.module').then((m) => m.PlayPageModule),
      },
      {
        path: 'knowledge',
        loadChildren: () =>
          import('../knowledge-base/knowledge-base.module').then(
            (m) => m.KnowledgeBasePageModule,
          ),
      },
      {
        path: 'progress',
        loadChildren: () =>
          import('../progress/progress.module').then((m) => m.ProgressPageModule),
      },
      {
        path: 'support',
        redirectTo: '/tabs/settings?panel=support',
        pathMatch: 'full',
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('../settings/settings.module').then((m) => m.SettingsPageModule),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsPageRoutingModule {}
