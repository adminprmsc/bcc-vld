import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CampaignAssign } from './campaign-assign';

describe('CampaignAssign', () => {
  let component: CampaignAssign;
  let fixture: ComponentFixture<CampaignAssign>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignAssign]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CampaignAssign);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
