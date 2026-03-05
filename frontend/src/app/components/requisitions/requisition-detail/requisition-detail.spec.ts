import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequisitionDetail } from './requisition-detail';

describe('RequisitionDetail', () => {
  let component: RequisitionDetail;
  let fixture: ComponentFixture<RequisitionDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequisitionDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequisitionDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
