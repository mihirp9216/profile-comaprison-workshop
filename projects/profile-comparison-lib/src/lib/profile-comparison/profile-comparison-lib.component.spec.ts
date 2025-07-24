import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileComparisonLibComponent } from './profile-comparison-lib.component';

describe('ProfileComparisonLibComponent', () => {
  let component: ProfileComparisonLibComponent;
  let fixture: ComponentFixture<ProfileComparisonLibComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProfileComparisonLibComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComparisonLibComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
