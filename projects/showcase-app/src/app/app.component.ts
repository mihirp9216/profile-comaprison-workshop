import { Component } from '@angular/core';
import { ProfileComparisonLibService } from 'projects/profile-comparison-lib/src/public-api';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  interests1: string[] = [];
  interests2: string[] = [];
  interests3: string[] = [];
  user1Image: string = '';
  user2Image: string = '';

  constructor(
    private ProfileComparisonLibService: ProfileComparisonLibService
  ) {}

  ngOnInit(): void {
    this.ProfileComparisonLibService.getData().subscribe((data) => {
      console.log(data);
      this.interests1 = data.interests1;
      this.interests2 = data.interests2;
      this.interests3 = data.interests3;
      this.user1Image = data.user1Image;
      this.user2Image = data.user2Image;
      console.log(this.interests1);
    });
  }

  onViewProfile(event: { user: number }): void {
    console.log(event.user);
    alert('You have been routed to a profile page');
  }
}
