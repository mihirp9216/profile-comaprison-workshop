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
  ViewEncapsulation,
  ViewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import Swiper from 'swiper';
import { catchError, map, of } from 'rxjs';
import { FaceBoundingBox } from './profile-comparison.models';
// import { UserNumber } from './models/profile-comparison.enums'; // if used

@Component({
  selector: 'lib-profile-comparison',
  templateUrl: './profile-comparison-lib.component.html',
  styleUrls: ['./profile-comparison-lib.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ProfileComparisonLibComponent implements OnChanges, AfterViewInit {
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

  // IMPORTANT: Change #interestsContainerUserX to be on swiper-wrapper div (see HTML below)
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

  ngAfterViewInit(): void {
    console.log(this.interestsContainerUser1);
    // Initialize Swiper on view init and after interests update
    setTimeout(() => this.initSwipers(), 0);
  }

  private initSwipers(): void {
    // Destroy existing swipers if any to avoid duplicates
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

  ngOnChanges(changes: SimpleChanges): void {
    console.log(changes);
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

  private prepareSimilarityMatrixAndOrder(): void {
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

    const similarityCache = new Map<string, number>();
    const pairKey = (a: string, b: string) => [a, b].sort().join('|');

    const fetchSimilarity = (a: string, b: string) => {
      const key = pairKey(a, b);
      if (similarityCache.has(key)) {
        return of(similarityCache.get(key)!);
      }
      const url = `https://api.api-ninjas.com/v1/textsimilarity?text1=${encodeURIComponent(
        a
      )}&text2=${encodeURIComponent(b)}`;

      return this.http
        .get<{ similarity: number }>(url, {
          headers: { 'X-Api-Key': this.API_KEY_NINJAS },
        })
        .pipe(
          map((res) => {
            similarityCache.set(key, res.similarity);
            return res.similarity;
          }),
          catchError(() => {
            this.textSimilarityApiFailed = true;
            similarityCache.set(key, 0);
            return of(0);
          })
        );
    };

    const similarityMatrix: number[][] = [];

    const fetchAllPairsSequentially = async () => {
      for (let i = 0; i < interestsList.length; i++) {
        similarityMatrix[i] = [];
        for (let j = 0; j < interestsList.length; j++) {
          if (i === j) {
            similarityMatrix[i][j] = 1;
          } else {
            try {
              const similarity = await fetchSimilarity(
                interestsList[i],
                interestsList[j]
              ).toPromise();
              similarityMatrix[i][j] = similarity ?? 0;
            } catch {
              similarityMatrix[i][j] = 0;
            }
          }
        }
      }
    };

    (async () => {
      try {
        await fetchAllPairsSequentially();

        this.similarityMatrix = similarityMatrix;

        const interestIndexMap = new Map<string, number>();
        interestsList.forEach((s, i) => interestIndexMap.set(s, i));

        const reorderInterests = (userInterests: string[]) => {
          return [...userInterests].sort((a, b) => {
            const iA = interestIndexMap.get(a)!;
            const iB = interestIndexMap.get(b)!;
            const avgA =
              similarityMatrix[iA].reduce((acc, v) => acc + v, 0) /
              similarityMatrix.length;
            const avgB =
              similarityMatrix[iB].reduce((acc, v) => acc + v, 0) /
              similarityMatrix.length;
            return avgB - avgA;
          });
        };

        this.orderedInterestsUser1 = reorderInterests(this.interestsUser1);
        this.orderedInterestsUser2 = reorderInterests(this.interestsUser2);
        this.orderedInterestsUser3 = reorderInterests(this.interestsUser3);
      } catch {
        this.textSimilarityApiFailed = true;
        this.orderedInterestsUser1 = [...this.interestsUser1].sort();
        this.orderedInterestsUser2 = [...this.interestsUser2].sort();
        this.orderedInterestsUser3 = [...this.interestsUser3].sort();
        this.similarityMatrix = [];
      } finally {
        this.loadingSimilarity = false;
        this.cd.markForCheck();
        setTimeout(() => this.initSwipers(), 0);
      }
    })();
  }

  private clearInterestsAndLoading(): void {
    this.orderedInterestsUser1 = [];
    this.orderedInterestsUser2 = [];
    this.orderedInterestsUser3 = [];
    this.similarityMatrix = [];
    this.loadingSimilarity = false;
    this.cd.markForCheck();
  }

  private detectFacesAndAlign(): void {
    this.loadingFaceDetect = true;
    this.faceBoxUser1 = null;
    this.faceBoxUser2 = null;

    const detectFace = (imageSrc: string) => {
      if (!imageSrc) {
        return of<FaceBoundingBox | null>(null);
      }
      const url = `${this.FACE_DETECT_API_URL}${encodeURIComponent(imageSrc)}`;
      return this.http
        .get<{
          faces: { x: number; y: number; width: number; height: number }[];
        }>(url, {
          headers: { 'X-Api-Key': this.API_KEY_NINJAS },
        })
        .pipe(
          map((res) =>
            res.faces && res.faces.length > 0 ? res.faces[0] : null
          ),
          catchError(() => of(null))
        );
    };

    Promise.all([
      detectFace(this.user1ImageSrc).toPromise(),
      detectFace(this.user2ImageSrc).toPromise(),
    ])
      .then(([face1, face2]) => {
        this.faceBoxUser1 = face1 ?? null;
        this.faceBoxUser2 = face2 ?? null;
        this.cd.markForCheck();
        this.applyImageAlignment();
      })
      .finally(() => {
        this.loadingFaceDetect = false;
        this.cd.markForCheck();
      });
  }

  private applyImageAlignment(): void {
    if (!this.faceBoxUser1 || !this.faceBoxUser2) {
      return;
    }
    // Approx eyes line: y + 0.4 * height
    const eyeLine1 = this.faceBoxUser1.y + this.faceBoxUser1.height * 0.4;
    const eyeLine2 = this.faceBoxUser2.y + this.faceBoxUser2.height * 0.4;
    const translateY = eyeLine1 - eyeLine2;

    if (this.imageContainerUser2) {
      this.imageContainerUser2.nativeElement.style.transform = `translateY(${translateY}px)`;
    }
  }

  onViewProfileClick(userNumber: number): void {
    this.viewProfileClicked.emit({ user: userNumber });
  }
}
