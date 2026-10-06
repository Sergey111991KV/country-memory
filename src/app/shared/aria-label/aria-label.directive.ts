import { Directive, ElementRef, Input, OnChanges, inject } from '@angular/core';

type MaybeStencilElement = HTMLElement & { componentOnReady?: () => Promise<unknown> };

/**
 * Sets `aria-label` on Ionic components once they are hydrated.
 *
 * Binding `[attr.aria-label]` directly on lazy Ionic elements (ion-button,
 * ion-toggle …) can fire Stencil's attribute watcher before the component
 * instance exists, which throws "Cannot read properties of undefined
 * (reading 'onAriaChanged')" and leaves the inner native control unlabeled.
 */
@Directive({
  selector: '[appAriaLabel]',
  standalone: false,
})
export class AriaLabelDirective implements OnChanges {
  @Input('appAriaLabel') label: string | null | undefined = null;

  private readonly host = inject<ElementRef<MaybeStencilElement>>(ElementRef).nativeElement;
  private version = 0;

  ngOnChanges(): void {
    const version = ++this.version;
    const apply = (): void => {
      if (version !== this.version) {
        return;
      }
      if (this.label) {
        this.host.setAttribute('aria-label', this.label);
      } else {
        this.host.removeAttribute('aria-label');
      }
    };
    if (typeof this.host.componentOnReady === 'function') {
      void this.host.componentOnReady().then(apply);
    } else {
      apply();
    }
  }
}
