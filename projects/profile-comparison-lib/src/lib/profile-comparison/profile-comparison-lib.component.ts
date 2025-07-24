import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  AfterViewInit,
  ElementRef,
  ViewChild,
  OnInit,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import Swiper from 'swiper';
import { catchError, forkJoin, map, of, Observable } from 'rxjs';
import { FaceBoundingBox } from './profile-comparison.models';

@Component({
  selector: 'lib-profile-comparison',
  templateUrl: './profile-comparison-lib.component.html',
  styleUrls: ['./profile-comparison-lib.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComparisonLibComponent
  implements OnChanges, AfterViewInit, OnInit
{
  @Input() interestsUser1: string[] = [];
  @Input() interestsUser2: string[] = [];
  @Input() interestsUser3: string[] = [];

  @Input() user1ImageSrc = '';
  @Input() user2ImageSrc = '';

  @Output() viewProfileClicked = new EventEmitter<{ user: number }>();

  similarityMatrix: number[][] = [];

  orderedInterestsUser1: string[] = [];
  orderedInterestsUser2: string[] = [];
  orderedInterestsUser3: string[] = [];

  faceBoxUser1: FaceBoundingBox | null = null;
  faceBoxUser2: FaceBoundingBox | null = null;

  textSimilarityApiFailed = false;

  loadingSimilarity = false;
  loadingFaceDetect = false;

  swiperInstanceUser1: Swiper | null = null;
  swiperInstanceUser2: Swiper | null = null;
  swiperInstanceUser3: Swiper | null = null;

  @ViewChild('interestsContainerUser1', { static: false, read: ElementRef })
  interestsContainerUser1!: ElementRef;

  @ViewChild('interestsContainerUser2', { static: false, read: ElementRef })
  interestsContainerUser2!: ElementRef;

  @ViewChild('interestsContainerUser3', { static: false, read: ElementRef })
  interestsContainerUser3!: ElementRef;

  @ViewChild('imageContainerUser1', { static: false, read: ElementRef })
  imageContainerUser1!: ElementRef;

  @ViewChild('imageContainerUser2', { static: false, read: ElementRef })
  imageContainerUser2!: ElementRef;

  private readonly API_KEY_NINJAS = 'UmwGgJ4GmCX5K1ndxwBxWA==pVWDrJFP2KQxMoUP';
  private readonly FACE_DETECT_API_URL =
    'https://api.api-ninjas.com/v1/facedetect?image=';

  constructor(private http: HttpClient, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.prepareSimilarityMatrixAndOrder();
    this.detectFacesAndAlign();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initSwipers(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['interestsUser1'] ||
      changes['interestsUser2'] ||
      changes['interestsUser3']
    ) {
      this.prepareSimilarityMatrixAndOrder();
    }

    if (changes['user1ImageSrc'] || changes['user2ImageSrc']) {
      this.detectFacesAndAlign();
    }
  }

  initSwipers(): void {
    if (this.swiperInstanceUser1) {
      this.swiperInstanceUser1.destroy(true, true);
      this.swiperInstanceUser1 = null;
    }
    if (this.swiperInstanceUser2) {
      this.swiperInstanceUser2.destroy(true, true);
      this.swiperInstanceUser2 = null;
    }
    if (this.swiperInstanceUser3) {
      this.swiperInstanceUser3.destroy(true, true);
      this.swiperInstanceUser3 = null;
    }

    if (this.interestsContainerUser1) {
      this.swiperInstanceUser1 = new Swiper(
        this.interestsContainerUser1.nativeElement,
        {
          slidesPerView: 'auto',
          freeMode: true,
          scrollbar: {
            el: '.swiper-scrollbar',
            draggable: true,
          },
          mousewheel: true,
        }
      );
    }

    if (this.interestsContainerUser2) {
      this.swiperInstanceUser2 = new Swiper(
        this.interestsContainerUser2.nativeElement,
        {
          slidesPerView: 'auto',
          freeMode: true,
          scrollbar: {
            el: '.swiper-scrollbar',
            draggable: true,
          },
          mousewheel: true,
        }
      );
    }

    if (this.interestsContainerUser3) {
      this.swiperInstanceUser3 = new Swiper(
        this.interestsContainerUser3.nativeElement,
        {
          slidesPerView: 'auto',
          freeMode: true,
          scrollbar: {
            el: '.swiper-scrollbar',
            draggable: true,
          },
          mousewheel: true,
        }
      );
    }
  }

  clearInterestsAndLoading(): void {
    this.orderedInterestsUser1 = [];
    this.orderedInterestsUser2 = [];
    this.orderedInterestsUser3 = [];
    this.similarityMatrix = [];
    this.loadingSimilarity = false;
    this.cd.markForCheck();
  }

  fetchTextSimilarity(a: string, b: string): Observable<number> {
    if (a === b) {
      return of(1);
    }
    const url = `https://api.api-ninjas.com/v1/textsimilarity?text1=${encodeURIComponent(
      a
    )}&text2=${encodeURIComponent(b)}`;

    return this.http
      .get<{ similarity: number }>(url, {
        headers: { 'X-Api-Key': this.API_KEY_NINJAS },
      })
      .pipe(
        map((res) => res.similarity),
        catchError(() => {
          this.textSimilarityApiFailed = true;
          return of(0);
        })
      );
  }

  prepareSimilarityMatrixAndOrder(): void {
    this.loadingSimilarity = true;
    this.textSimilarityApiFailed = false;

    const uniqueInterests = new Set<string>([
      ...this.interestsUser1,
      ...this.interestsUser2,
      ...this.interestsUser3,
    ]);

    const interestsList = Array.from(uniqueInterests);

    if (interestsList.length === 0) {
      this.clearInterestsAndLoading();
      return;
    }

    const similarityObservables: Observable<number>[] = [];
    const indexPairs: [number, number][] = [];

    for (let i = 0; i < interestsList.length; i++) {
      for (let j = 0; j < interestsList.length; j++) {
        indexPairs.push([i, j]);
        if (i === j) {
          similarityObservables.push(of(1));
        } else {
          similarityObservables.push(
            this.fetchTextSimilarity(interestsList[i], interestsList[j])
          );
        }
      }
    }

    forkJoin(similarityObservables).subscribe({
      next: (results) => {
        const matrix: number[][] = [];
        for (let i = 0; i < interestsList.length; i++) {
          matrix[i] = [];
        }
        results.forEach((sim, idx) => {
          const [i, j] = indexPairs[idx];
          matrix[i][j] = sim;
        });

        this.similarityMatrix = matrix;

        const interestIndexMap = new Map<string, number>();
        interestsList.forEach((s, i) => interestIndexMap.set(s, i));

        const reorderInterests = (userInterests: string[]) => {
          return [...userInterests].sort((a, b) => {
            const iA = interestIndexMap.get(a)!;
            const iB = interestIndexMap.get(b)!;
            const avgA =
              matrix[iA].reduce((acc, v) => acc + v, 0) / matrix.length;
            const avgB =
              matrix[iB].reduce((acc, v) => acc + v, 0) / matrix.length;
            return avgB - avgA;
          });
        };

        this.orderedInterestsUser1 = reorderInterests(this.interestsUser1);
        this.orderedInterestsUser2 = reorderInterests(this.interestsUser2);
        this.orderedInterestsUser3 = reorderInterests(this.interestsUser3);

        this.loadingSimilarity = false;
        this.cd.markForCheck();
        setTimeout(() => this.initSwipers(), 0);
      },
      error: () => {
        this.textSimilarityApiFailed = true;
        this.orderedInterestsUser1 = [...this.interestsUser1].sort();
        this.orderedInterestsUser2 = [...this.interestsUser2].sort();
        this.orderedInterestsUser3 = [...this.interestsUser3].sort();
        this.similarityMatrix = [];
        this.loadingSimilarity = false;
        this.cd.markForCheck();
      },
    });
  }

  detectFace(imageSrc: string): Observable<FaceBoundingBox | null> {
    if (!imageSrc) {
      return of(null);
    }
    const url = `${this.FACE_DETECT_API_URL}${encodeURIComponent(imageSrc)}`;
    return this.http
      .get<{
        faces: { x: number; y: number; width: number; height: number }[];
      }>(url, {
        headers: { 'X-Api-Key': this.API_KEY_NINJAS },
      })
      .pipe(
        map((res) => (res.faces && res.faces.length > 0 ? res.faces[0] : null)),
        catchError(() => of(null))
      );
  }

  detectFacesAndAlign(): void {
    this.loadingFaceDetect = true;
    forkJoin([
      this.detectFace(this.user1ImageSrc),
      this.detectFace(this.user2ImageSrc),
    ]).subscribe({
      next: ([face1, face2]) => {
        this.faceBoxUser1 = face1;
        this.faceBoxUser2 = face2;
        this.cd.markForCheck();
        this.applyImageAlignment();
      },
      complete: () => {
        this.loadingFaceDetect = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.loadingFaceDetect = false;
        this.cd.markForCheck();
      },
    });
  }

  applyImageAlignment(): void {
    if (!this.faceBoxUser1 || !this.faceBoxUser2) {
      return;
    }
    const eyeLine1 = this.faceBoxUser1.y + this.faceBoxUser1.height * 0.4;
    const eyeLine2 = this.faceBoxUser2.y + this.faceBoxUser2.height * 0.4;
    const translateY = eyeLine1 - eyeLine2;

    if (this.imageContainerUser2) {
      this.imageContainerUser2.nativeElement.style.transform = `translateY(${translateY}px)`;
    }
  }

  getFaceBoxStyle(box: FaceBoundingBox) {
    return {
      top: `${(box.y / 260) * 100}%`,
      left: `${(box.x / 200) * 100}%`,
      width: `${(box.width / 200) * 100}%`,
      height: `${(box.height / 260) * 100}%`,
      position: 'absolute',
    };
  }

  getObjectPosition(box: FaceBoundingBox | null) {
    if (!box) return 'center center';
    const centerY = box.y + box.height * 0.4;
    const posY = Math.min(Math.max(((130 - centerY) / 260) * 100, 0), 100);
    return `center ${posY}%`;
  }

  getAllUniqueInterests(): string[] {
    return Array.from(
      new Set([
        ...this.orderedInterestsUser1,
        ...this.orderedInterestsUser2,
        ...this.orderedInterestsUser3,
      ])
    );
  }

  getInterestColor(interest: string) {
    const allInterests = this.getAllUniqueInterests();
    const idx = allInterests.indexOf(interest);
    if (idx === -1 || !this.similarityMatrix.length) {
      return { backgroundColor: '#ddd', color: '#444' };
    }
    const avgSimilarity =
      this.similarityMatrix[idx].reduce((acc, v) => acc + v, 0) /
      this.similarityMatrix.length;
    const tealHue = 162;
    const lightness = 90 - avgSimilarity * 45;
    return {
      backgroundColor: `hsl(${tealHue}, 60%, ${lightness}%)`,
      color: avgSimilarity > 0.5 ? '#fff' : '#333',
    };
  }

  getHeatmapColor(value: number): string {
    if (value === 1) return '#2a9d8f'; // teal
    if (value === 0) return '#eee'; // light gray
    const tealRgb = [42, 157, 143];
    const grayRgb = [238, 238, 238];
    const r = Math.round(grayRgb[0] + (tealRgb[0] - grayRgb[0]) * value);
    const g = Math.round(grayRgb[1] + (tealRgb[1] - grayRgb[1]) * value);
    const b = Math.round(grayRgb[2] + (tealRgb[2] - grayRgb[2]) * value);
    return `rgb(${r},${g},${b})`;
  }

  onViewProfileClick(userNumber: number): void {
    this.viewProfileClicked.emit({ user: userNumber });
  }
}
