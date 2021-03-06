import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BuyNowBoxComponent } from './buy-now-box.component';

describe('BuyNowBoxComponent', () => {
  let component: BuyNowBoxComponent;
  let fixture: ComponentFixture<BuyNowBoxComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ BuyNowBoxComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BuyNowBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
