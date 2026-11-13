export interface CustomerReview {
  id: string;
  author: string;
  neighborhood: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
}

export const INITIAL_THREE_REVIEWS: CustomerReview[] = [
  {
    id: 'rev-1',
    author: 'فاطمة الزهراء ب.',
    neighborhood: 'طريق إيموزار، فاس',
    rating: 5,
    date: 'منذ يومين',
    comment: 'تبارك الله السلعة نقية وطازجة بحال إلا مشيتي للسوق نقيتيها بيدك، والتوصيل ديما فالموعد.',
    verified: true,
  },
  {
    id: 'rev-2',
    author: 'أمين التازي',
    neighborhood: 'طريق عين الشقف، فاس',
    rating: 5,
    date: 'منذ 3 أيام',
    comment: 'خدمة في المستوى وكتوفر بزاف ديال الوقت، الخضرة كتوصل مقادة ومغسولة بعناية. برافو عليكم.',
    verified: true,
  },
  {
    id: 'rev-3',
    author: 'نادية بنجلون',
    neighborhood: 'حي الأطلس، فاس',
    rating: 5,
    date: 'منذ 5 أيام',
    comment: 'تعامل راقي وثقة كبيرة، الفواكه حلوة والخضر طرية بزاف. أول تجربة وأكيد ماشي الأخيرة.',
    verified: true,
  },
  {
    id: 'rev-4',
    author: 'رشيد الإدريسي',
    neighborhood: 'حي النرجس، فاس',
    rating: 5,
    date: 'منذ أسبوع',
    comment: 'الجودة ممتازة والأسعار معقولة جداً مقارنة بالسوق. التغليف متقن والشباب مهذبين تبارك الله.',
    verified: true,
  },
  {
    id: 'rev-5',
    author: 'مريم الفاسي',
    neighborhood: 'حي السعادة، فاس',
    rating: 5,
    date: 'منذ أسبوع',
    comment: 'أحسن تجربة شراء خضار وفواكه أونلاين بفاس! سريعين بزاف والمنتجات نقية ومفرزة بحرفية.',
    verified: true,
  },
  {
    id: 'rev-6',
    author: 'يوسف العلمي',
    neighborhood: 'طريق صفرو، فاس',
    rating: 5,
    date: 'منذ 8 أيام',
    comment: 'البطاطا ومطيشة والبصلة قمة فالطراوة، ما كاينش حبة خاسرة. استمروا على هذا المستوى الممتاز.',
    verified: true,
  },
  {
    id: 'rev-7',
    author: 'سناء المرابط',
    neighborhood: 'حي بنسودة، فاس',
    rating: 5,
    date: 'منذ 9 أيام',
    comment: 'التوصيل سريع والطلب واصل سخون من السوق للدار. هنيتونا من الزحام ديال المارشي.',
    verified: true,
  },
  {
    id: 'rev-8',
    author: 'حمزة برادة',
    neighborhood: 'حي الدكارات، فاس',
    rating: 5,
    date: 'منذ 10 أيام',
    comment: 'دقة في التوقيت وأمانة في الوزن، الفواكه حلوة ومنعشة. الله يبارك ليكم فرزقكم.',
    verified: true,
  },
  {
    id: 'rev-9',
    author: 'خديجة الشرايبي',
    neighborhood: 'حي الزهور، فاس',
    rating: 5,
    date: 'منذ 12 يوماً',
    comment: 'من نهار جربت خُضرة ما بقيتش كنهز هم التقضية. السلعة كتوصل نقية ومعزولة بحبة حبة.',
    verified: true,
  },
  {
    id: 'rev-10',
    author: 'طارق الفيلالي',
    neighborhood: 'حي واد فاس، فاس',
    rating: 5,
    date: 'منذ أسبوعين',
    comment: 'تطبيق وموقع ساهل فالاستعمال والخدمة ممتازة، التوصيل فالموعد المحدد تماماً.',
    verified: true,
  },
  {
    id: 'rev-11',
    author: 'حنان الودغيري',
    neighborhood: 'طريق مكناس، فاس',
    rating: 5,
    date: 'منذ أسبوعين',
    comment: 'النعناع والقزبور والمعدنوس ريحتهم عاطية خضورية كتشهي، كلشي جديد ديال نهارو.',
    verified: true,
  },
  {
    id: 'rev-12',
    author: 'كريم الصقلي',
    neighborhood: 'حي الوفاق، فاس',
    rating: 5,
    date: 'منذ 16 يوماً',
    comment: 'خدمة احترافية بكل المقاييس، الدفع عند الاستلام مريح والتواصل عبر الواتساب في قمة اللباقة.',
    verified: true,
  },
];

export const INITIAL_REVIEWS = INITIAL_THREE_REVIEWS;

