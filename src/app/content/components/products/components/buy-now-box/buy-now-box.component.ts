import { Component, OnInit, Input } from '@angular/core';
import { BuyNowBoxData } from 'src/app/core/models/products/buy-now-box-data.model';
import { PublicIconPaths } from 'src/app/core/models/routes-and-paths/icon-paths.model';
import { Store } from '@ngrx/store';
import { RootStoreState, UserStoreActions } from 'src/app/root-store';
import { Product } from 'src/app/core/models/products/product.model';
import { Router } from '@angular/router';
import { PublicAppRoutes } from 'src/app/core/models/routes-and-paths/app-routes.model';

@Component({
  selector: 'app-buy-now-box',
  templateUrl: './buy-now-box.component.html',
  styleUrls: ['./buy-now-box.component.scss']
})
export class BuyNowBoxComponent implements OnInit {

  @Input() buyNowData: BuyNowBoxData;
  @Input() product: Product;

  iconPaths = PublicIconPaths;

  title: string;
  subtitle: string;
  buttonText: string;

  constructor(
    private store$: Store<RootStoreState.State>,
    private router: Router
  ) { }

  ngOnInit() {

  }

  onBuyNow() {
    this.store$.dispatch(new UserStoreActions.SetCartData({productData: this.product}));
    this.router.navigate([PublicAppRoutes.CHECKOUT]);
  }

}
