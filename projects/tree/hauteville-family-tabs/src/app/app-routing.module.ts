import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { FisherCrawfordComponent } from './fisher-crawford/fisher-crawford.component';
import { LepageBandetComponent } from './lepage-bandet/lepage-bandet.component';

const routes: Routes = [
  { path: '', redirectTo: 'fisher-crawford', pathMatch: 'full' },
  { path: 'fisher-crawford', component: FisherCrawfordComponent },
  { path: 'lepage-bandet', component: LepageBandetComponent },
  {
    path: 'family-tree',
    loadChildren: () => import('./family-tree/family-tree.module').then(m => m.FamilyTreePageModule)
  },
  {
    path: 'bar-chart',
    loadChildren: () => import('./bar-chart/bar-chart.module').then(m => m.BarChartPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
