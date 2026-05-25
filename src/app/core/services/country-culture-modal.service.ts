import { Injectable, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';

import { CountryCultureModalComponent } from '../../shared/country-culture-modal/country-culture-modal.component';

export interface CountryCultureModalParams {
  iso2: string;
  countryName: string;
  capital: string;
  continentLabel: string;
  continentId: string;
}

@Injectable({ providedIn: 'root' })
export class CountryCultureModalService {
  private readonly modalCtrl = inject(ModalController);

  async open(params: CountryCultureModalParams): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: CountryCultureModalComponent,
      componentProps: params,
      cssClass: 'country-culture-modal-shell',
      backdropDismiss: true,
      showBackdrop: true,
    });
    await modal.present();
  }
}
