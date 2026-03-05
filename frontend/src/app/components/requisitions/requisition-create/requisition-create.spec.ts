import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequisitionCreate } from './requisition-create';

describe('RequisitionCreate', () => {
  let component: RequisitionCreate;
  let fixture: ComponentFixture<RequisitionCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequisitionCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequisitionCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
