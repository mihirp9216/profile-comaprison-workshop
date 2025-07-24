// profile-comparison.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ProfileComparisonLibComponent } from './profile-comparison-lib.component';

@NgModule({
  declarations: [ProfileComparisonLibComponent],
  imports: [CommonModule, HttpClientModule],
  exports: [ProfileComparisonLibComponent],
})
export class ProfileComparisonModule {}
