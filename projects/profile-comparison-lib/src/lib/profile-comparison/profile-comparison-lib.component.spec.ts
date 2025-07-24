import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { ProfileComparisonLibComponent } from './profile-comparison-lib.component';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ChangeDetectionStrategy, ElementRef } from '@angular/core';
import { FaceBoundingBox } from './profile-comparison.models';

describe('ProfileComparisonLibComponent', () => {
  let spectator: Spectator<ProfileComparisonLibComponent>;
  let httpMock: HttpTestingController;

  const createComponent = createComponentFactory({
    component: ProfileComparisonLibComponent,
    imports: [HttpClientTestingModule],
    detectChanges: false,
    componentProviders: [
      {
        provide: ChangeDetectionStrategy,
        useValue: ChangeDetectionStrategy.Default,
      },
    ],
  });

  beforeEach(() => {
    spectator = createComponent();
    httpMock = spectator.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  describe('getFaceBoxStyle', () => {
    it('should return correct style percentages for face box', () => {
      const box: FaceBoundingBox = { x: 40, y: 52, width: 120, height: 130 };
      const style = spectator.component.getFaceBoxStyle(box);
      expect(style.top).toBe(`${(52 / 260) * 100}%`);
      expect(style.left).toBe(`${(40 / 200) * 100}%`);
      expect(style.width).toBe(`${(120 / 200) * 100}%`);
      expect(style.height).toBe(`${(130 / 260) * 100}%`);
      expect(style.position).toBe('absolute');
    });
  });

  describe('getObjectPosition', () => {
    it('should return center center if box is null', () => {
      expect(spectator.component.getObjectPosition(null)).toBe('center center');
    });

    it('should calculate object position correctly', () => {
      const box: FaceBoundingBox = { x: 0, y: 130, width: 200, height: 130 };
      const result = spectator.component.getObjectPosition(box);
      // The posY calculation clamps between 0 and 100
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^center \d+(\.\d+)?%$/);
    });
  });

  describe('getAllUniqueInterests', () => {
    it('should return sorted unique interests from all users', () => {
      spectator.component.orderedInterestsUser1 = ['reading', 'music'];
      spectator.component.orderedInterestsUser2 = ['music', 'sports'];
      spectator.component.orderedInterestsUser3 = ['travel', 'reading'];
      const unique = spectator.component.getAllUniqueInterests();
      expect(unique).toEqual(
        expect.arrayContaining(['reading', 'music', 'sports', 'travel'])
      );
    });
  });

  describe('getInterestColor', () => {
    it('should return default color when matrix is empty or interest not found', () => {
      spectator.component.similarityMatrix = [];
      expect(spectator.component.getInterestColor('unknown')).toEqual({
        backgroundColor: '#ddd',
        color: '#444',
      });
    });

    it('should return color based on average similarity', () => {
      spectator.component.similarityMatrix = [
        [1, 0.5],
        [0.5, 1],
      ];
      const interests = ['a', 'b'];
      spectator.component.orderedInterestsUser1 = interests;
      spectator.component.orderedInterestsUser2 = interests;
      spectator.component.orderedInterestsUser3 = interests;
      const color = spectator.component.getInterestColor('a');
      expect(color).toHaveProperty('backgroundColor');
      expect(color).toHaveProperty('color');
    });
  });

  describe('getHeatmapColor', () => {
    it('should return teal for 1 and light gray for 0', () => {
      expect(spectator.component.getHeatmapColor(1)).toBe('#2a9d8f');
      expect(spectator.component.getHeatmapColor(0)).toBe('#eee');
    });

    it('should return rgb color for intermediate values', () => {
      const color = spectator.component.getHeatmapColor(0.5);
      expect(color).toMatch(/^rgb\(\d{1,3},\d{1,3},\d{1,3}\)$/);
    });
  });

  describe('fetchTextSimilarity', () => {
    it('should return 1 if texts are equal without http call', (done) => {
      spectator.component
        .fetchTextSimilarity('test', 'test')
        .subscribe((res) => {
          expect(res).toBe(1);
          done();
        });
    });

    it('should make http call and return similarity value', (done) => {
      const text1 = 'hello';
      const text2 = 'world';
      spectator.component.fetchTextSimilarity(text1, text2).subscribe((res) => {
        expect(res).toBe(0.7);
        done();
      });
      const req = httpMock.expectOne((req) =>
        req.url.includes('textsimilarity')
      );
      expect(req.request.method).toBe('GET');
      req.flush({ similarity: 0.7 });
    });

    it('should handle http error and set apiFailed flag', (done) => {
      spectator.component.textSimilarityApiFailed = false;
      spectator.component.fetchTextSimilarity('a', 'b').subscribe((res) => {
        expect(res).toBe(0);
        expect(spectator.component.textSimilarityApiFailed).toBeTruthy();
        done();
      });
      const req = httpMock.expectOne((req) =>
        req.url.includes('textsimilarity')
      );
      req.error(new ErrorEvent('Network error'));
    });
  });

  describe('prepareSimilarityMatrixAndOrder', () => {
    it('should clear interests and stop loading if no interests', () => {
      jest.spyOn<any, any>(spectator.component, 'clearInterestsAndLoading');
      spectator.component.interestsUser1 = [];
      spectator.component.interestsUser2 = [];
      spectator.component.interestsUser3 = [];
      spectator.component.prepareSimilarityMatrixAndOrder();
      expect(
        spectator.component['clearInterestsAndLoading']
      ).toHaveBeenCalled();
    });

    it('should fetch similarity matrix and reorder interests', (done) => {
      spectator.component.interestsUser1 = ['a'];
      spectator.component.interestsUser2 = ['b'];
      spectator.component.interestsUser3 = ['c'];

      spectator.component.prepareSimilarityMatrixAndOrder();

      const requests = httpMock.match((req) =>
        req.url.includes('textsimilarity')
      );
      expect(requests.length).toBeGreaterThan(0);
      requests.forEach((req) => req.flush({ similarity: 0.8 }));

      setTimeout(() => {
        expect(spectator.component.similarityMatrix.length).toBe(3);
        expect(spectator.component.orderedInterestsUser1.length).toBe(1);
        expect(spectator.component.loadingSimilarity).toBe(false);
        done();
      }, 200);
    });

    it('should handle error and fallback to alphabetical order', (done) => {
      spectator.component.interestsUser1 = ['a'];
      spectator.component.interestsUser2 = ['b'];
      spectator.component.interestsUser3 = ['c'];

      spectator.component.prepareSimilarityMatrixAndOrder();

      const requests = httpMock.match((req) =>
        req.url.includes('textsimilarity')
      );
      requests.forEach((req) => req.error(new ErrorEvent('Network error')));

      setTimeout(() => {
        expect(spectator.component.textSimilarityApiFailed).toBe(true);
        expect(spectator.component.similarityMatrix.length).toBe(0);
        expect(spectator.component.orderedInterestsUser1).toEqual(['a']);
        done();
      }, 200);
    });
  });

  describe('detectFace and detectFacesAndAlign', () => {
    it('should return null Observable if no image source', (done) => {
      spectator.component.detectFace('').subscribe((val) => {
        expect(val).toBeNull();
        done();
      });
    });

    it('should fetch face data from API', (done) => {
      const mockFace: FaceBoundingBox = { x: 10, y: 20, width: 50, height: 60 };
      spectator.component.detectFace('someURL').subscribe((face) => {
        expect(face).toEqual(mockFace);
        done();
      });
      const req = httpMock.expectOne((req) => req.url.includes('facedetect'));
      expect(req.request.method).toBe('GET');
      req.flush({ faces: [mockFace] });
    });

    it('should handle face detection errors gracefully', (done) => {
      spectator.component.detectFace('badURL').subscribe((val) => {
        expect(val).toBeNull();
        done();
      });
      const req = httpMock.expectOne((req) => req.url.includes('facedetect'));
      req.error(new ErrorEvent('Network error'));
    });

    it('should detect faces for user 1 and 2 and apply alignment', (done) => {
      const face1: FaceBoundingBox = { x: 10, y: 20, width: 50, height: 60 };
      const face2: FaceBoundingBox = { x: 15, y: 25, width: 40, height: 55 };
      spectator.component.user1ImageSrc = 'url1';
      spectator.component.user2ImageSrc = 'url2';

      // Assign mock for private property imageContainerUser2
      const mockNativeEl = document.createElement('div');
      (spectator.component as any).imageContainerUser2 = {
        nativeElement: mockNativeEl,
      } as ElementRef;

      // Spy on markForCheck to ensure change detection triggered
      const cdSpy = jest.spyOn((spectator.component as any).cd, 'markForCheck');

      spectator.component.detectFacesAndAlign();

      const requests = httpMock.match((req) => req.url.includes('facedetect'));
      expect(requests.length).toBe(2);
      requests[0].flush({ faces: [face1] });
      requests[1].flush({ faces: [face2] });

      setTimeout(() => {
        expect(spectator.component.faceBoxUser1).toEqual(face1);
        expect(spectator.component.faceBoxUser2).toEqual(face2);
        expect(mockNativeEl.style.transform).toContain('translateY');
        expect(spectator.component.loadingFaceDetect).toBe(false);
        expect(cdSpy).toHaveBeenCalled();
        done();
      }, 50);
    });
  });

  describe('view profile click', () => {
    it('should emit event when onViewProfileClick is called', () => {
      jest.spyOn(spectator.component.viewProfileClicked, 'emit');
      spectator.component.onViewProfileClick(2);
      expect(spectator.component.viewProfileClicked.emit).toHaveBeenCalledWith({
        user: 2,
      });
    });
  });
});
