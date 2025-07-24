import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ProfileComparisonLibService {

  private data = {
    interests1: ['Hiking', 'Swimming', 'Gaming', 'Coding'],
    interests2: ['Reading', 'Cooking', 'Gaming', 'Travel'],
    interests3: ['Cooking', 'Travel', 'Photography'],
    user1Image: 'https://randomuser.me/api/portraits/men/32.jpg',
    user2Image: 'https://randomuser.me/api/portraits/women/65.jpg',
  };
  getData(): Observable<any> {
    return of(this.data); // Replace with HttpClient call for real API
  }

}
