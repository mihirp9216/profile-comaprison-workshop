import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { ProfileComparisonModule } from 'projects/profile-comparison-lib/src/public-api';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule, ProfileComparisonModule],
  providers: [],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}
