import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { ProfileComparisonLibService } from './profile-comparison-lib.service';

fdescribe('ProfileComparisonLibService', () => {
  let spectator: SpectatorService<ProfileComparisonLibService>;

  const createSpectator = () => {
    spectator = createServiceFactory(ProfileComparisonLibService)();
  };

  beforeEach(() => {
    createSpectator();
  });

  it('should be created', () => {
    expect(spectator.service).toBeTruthy();
  });

  it('should return data from getData()', (done) => {
    spectator.service.getData().subscribe((data) => {
      expect(data).toBeTruthy();
      expect(data.interests1).toEqual([
        'Hiking',
        'Swimming',
        'Gaming',
        'Coding',
      ]);
      expect(data.interests2).toEqual([
        'Reading',
        'Cooking',
        'Gaming',
        'Travel',
      ]);
      expect(data.interests3).toEqual(['Cooking', 'Travel', 'Photography']);
      expect(data.user1Image).toBe(
        'https://randomuser.me/api/portraits/men/32.jpg'
      );
      expect(data.user2Image).toBe(
        'https://randomuser.me/api/portraits/women/65.jpg'
      );
      done();
    });
  });
});
