export type Sport = string;

export type Coach = {
  id: string;
  name: string;
  location: string;
  sports: Sport[];
  tags: string[];
  specialty: string;
  rating: number | null;
  reviewCount: number;
  price: number;
  reason: string;
  badge: string;
  mode: "In person" | "Online" | "In person + Online";
  offersOnline: boolean;
  offersInPerson: boolean;
  area: string;
  coordinates: [longitude: number, latitude: number] | null;
  availability: string[];
  image: string | null;
  avatar?: string | null;
  adImages?: string[];
  rank: number;
  bio: string;
  experience: string;
  credentials: string[];
  coachingStyle: string;
  languages: string[];
  lessonCount: number;
  audiences: string[];
  levels: string[];
  lessonPlan: Array<{ title: string; description: string }>;
  isDemo?: boolean;
  faqs: Array<{ question: string; answer: string }>;
};

type BaseCoach = Omit<Coach, "tags" | "offersOnline" | "offersInPerson" | "area" | "coordinates" | "bio" | "experience" | "credentials" | "coachingStyle" | "languages" | "lessonCount" | "audiences" | "levels" | "lessonPlan" | "faqs">;

const baseCoaches: BaseCoach[] = [
  {
    id: "ayesha-khan",
    name: "Ayesha Khan",
    location: "Lahore",
    sports: ["Cricket"],
    specialty: "Beginner batting technique",
    rating: 4.9,
    reviewCount: 48,
    price: 3500,
    reason: "Strong fit for beginner batting in Lahore.",
    badge: "Top match",
    mode: "In person",
    availability: ["Saturday", "Sunday"],
    image: "/images/coach-ayesha.jpg",
    rank: 1,
  },
  {
    id: "hamza-siddiqui",
    name: "Hamza Siddiqui",
    location: "Karachi",
    sports: ["Tennis", "Badminton"],
    specialty: "Foundations and match play",
    rating: 4.8,
    reviewCount: 36,
    price: 4000,
    reason: "Beginner-friendly tennis coaching with court equipment available.",
    badge: "Great fit",
    mode: "In person",
    availability: ["Tuesday", "Saturday"],
    image: "/images/coach-hamza.jpg",
    rank: 2,
  },
  {
    id: "sara-ahmed",
    name: "Sara Ahmed",
    location: "Islamabad",
    sports: ["Strength"],
    specialty: "Strength and conditioning",
    rating: 4.7,
    reviewCount: 29,
    price: 3000,
    reason: "Online strength coaching designed for limited equipment.",
    badge: "Online",
    mode: "Online",
    availability: ["Monday", "Wednesday"],
    image: "/images/coach-sara.jpg",
    rank: 3,
  },
  {
    id: "zainab-malik",
    name: "Zainab Malik",
    location: "Karachi",
    sports: ["Cricket"],
    specialty: "Fast bowling and fielding",
    rating: 4.8,
    reviewCount: 31,
    price: 3800,
    reason: "Focused coaching for bowling rhythm and fielding speed.",
    badge: "Cricket skills",
    mode: "In person",
    availability: ["Friday", "Saturday"],
    image: "/images/coach-zainab.jpg",
    rank: 4,
  },
  {
    id: "omar-farooq",
    name: "Omar Farooq",
    location: "Islamabad",
    sports: ["Tennis"],
    specialty: "Serve technique and footwork",
    rating: 4.7,
    reviewCount: 22,
    price: 2800,
    reason: "Flexible coaching for serve mechanics and confident movement.",
    badge: "Flexible",
    mode: "Online",
    availability: ["Saturday", "Sunday"],
    image: "/images/coach-omar.jpg",
    rank: 5,
  },
  {
    id: "bilal-raza",
    name: "Bilal Raza",
    location: "Lahore",
    sports: ["Strength", "Football"],
    specialty: "Athletic strength and mobility",
    rating: 4.9,
    reviewCount: 41,
    price: 3200,
    reason: "Athlete-focused sessions balancing power, control and mobility.",
    badge: "Athletic prep",
    mode: "In person",
    availability: ["Monday", "Thursday"],
    image: "/images/coach-bilal.jpg",
    rank: 6,
  },
  {
    id: "danish-iqbal",
    name: "Danish Iqbal",
    location: "Karachi",
    sports: ["Football"],
    specialty: "Ball control and attacking movement",
    rating: 4.8,
    reviewCount: 54,
    price: 3600,
    reason: "Practical football sessions for sharper control, passing and movement.",
    badge: "Popular",
    mode: "In person",
    availability: ["Wednesday", "Sunday"],
    image: "/images/coach-danish.jpg",
    rank: 7,
  },
  {
    id: "hira-noor",
    name: "Hira Noor",
    location: "Lahore",
    sports: ["Badminton"],
    specialty: "Footwork, serves and rally confidence",
    rating: 4.9,
    reviewCount: 39,
    price: 3000,
    reason: "Friendly technical coaching for new and returning badminton players.",
    badge: "Player favorite",
    mode: "In person",
    availability: ["Tuesday", "Friday"],
    image: "/images/coach-hira.jpg",
    rank: 8,
  },
  {
    id: "farhan-akram",
    name: "Farhan Akram",
    location: "Islamabad",
    sports: ["Swimming"],
    specialty: "Stroke efficiency and water confidence",
    rating: 4.8,
    reviewCount: 46,
    price: 4200,
    reason: "Structured pool sessions for breathing, technique and endurance.",
    badge: "Technique first",
    mode: "In person",
    availability: ["Thursday", "Saturday"],
    image: "/images/coach-farhan.jpg",
    rank: 9,
  },
  {
    id: "mariam-shah",
    name: "Mariam Shah",
    location: "Karachi",
    sports: ["Boxing"],
    specialty: "Boxing fundamentals and conditioning",
    rating: 4.9,
    reviewCount: 33,
    price: 3900,
    reason: "Beginner-safe coaching covering stance, defense and controlled combinations.",
    badge: "Beginner friendly",
    mode: "In person",
    availability: ["Monday", "Saturday"],
    image: "/images/coach-mariam.jpg",
    rank: 10,
  },
  {
    id: "usman-tariq",
    name: "Usman Tariq",
    location: "Lahore",
    sports: ["Basketball"],
    specialty: "Shooting mechanics and court awareness",
    rating: 4.7,
    reviewCount: 28,
    price: 3400,
    reason: "Skill-focused basketball coaching for confident decisions under pressure.",
    badge: "Skills coach",
    mode: "In person",
    availability: ["Friday", "Sunday"],
    image: "/images/coach-usman.jpg",
    rank: 11,
  },
  {
    id: "nadia-hussain",
    name: "Nadia Hussain",
    location: "Islamabad",
    sports: ["Running"],
    specialty: "Running form and sustainable endurance",
    rating: 4.8,
    reviewCount: 61,
    price: 2600,
    reason: "Flexible coaching plans for safer mileage and stronger race preparation.",
    badge: "Flexible plan",
    mode: "Online",
    availability: ["Tuesday", "Sunday"],
    image: "/images/coach-nadia.jpg",
    rank: 12,
  },
  {
    id: "rida-aslam",
    name: "Rida Aslam",
    location: "Lahore",
    sports: ["Yoga"],
    specialty: "Mobility, balance and recovery",
    rating: 4.9,
    reviewCount: 57,
    price: 2700,
    reason: "Accessible sessions that support mobility, control and athletic recovery.",
    badge: "Recovery",
    mode: "Online",
    availability: ["Wednesday", "Saturday"],
    image: "/images/coach-rida.jpg",
    rank: 13,
  },
  {
    id: "sameer-qureshi",
    name: "Sameer Qureshi",
    location: "Karachi",
    sports: ["Ice Hockey"],
    specialty: "Skating, puck control and positional play",
    rating: 4.7,
    reviewCount: 35,
    price: 3500,
    reason: "Game-aware ice hockey coaching for cleaner skills and better positioning.",
    badge: "Team sport",
    mode: "In person",
    availability: ["Thursday", "Sunday"],
    image: "/images/coach-sameer.jpg",
    rank: 14,
  },
  {
    id: "iqra-javed",
    name: "Iqra Javed",
    location: "Islamabad",
    sports: ["Table Tennis"],
    specialty: "Spin, placement and match tactics",
    rating: 4.8,
    reviewCount: 43,
    price: 2900,
    reason: "Technical sessions for reliable strokes, spin reading and smarter rallies.",
    badge: "Match tactics",
    mode: "In person",
    availability: ["Monday", "Friday"],
    image: "/images/coach-iqra.jpg",
    rank: 15,
  },
];

const styleBySport: Record<Sport, string> = {
  Badminton: "Clear demonstrations, repeatable footwork patterns and rally-based progress.",
  Basketball: "Skill repetitions followed by realistic decisions and short competitive games.",
  Boxing: "Controlled technical rounds with safety, defense and confidence before intensity.",
  Cricket: "Simple technical cues, video feedback and game-like practice with a clear weekly goal.",
  Football: "Ball-heavy sessions that move from technique into realistic small-sided situations.",
  "Ice Hockey": "Fast skill blocks, positional scenarios and practical team-play feedback.",
  Running: "Sustainable progress through form cues, manageable volume and honest recovery checks.",
  Strength: "Measured progress, clear movement coaching and programs adapted to available equipment.",
  Swimming: "Calm pool instruction using short drills, breathing control and visible technique goals.",
  "Table Tennis": "High-repetition stroke work followed by spin-reading and point construction.",
  Tennis: "Technical foundations, purposeful drills and match situations without information overload.",
  Yoga: "Accessible movement sequences with patient cues and options for different mobility levels.",
};

const trainingAreaByCoach: Record<string, { area: string; coordinates: Coach["coordinates"] }> = {
  "ayesha-khan": { area: "Gulberg", coordinates: [74.3587, 31.5204] },
  "hamza-siddiqui": { area: "Clifton", coordinates: [67.0307, 24.8138] },
  "sara-ahmed": { area: "Online", coordinates: null },
  "zainab-malik": { area: "DHA", coordinates: [67.0556, 24.799] },
  "omar-farooq": { area: "Online", coordinates: null },
  "bilal-raza": { area: "DHA Phase 5", coordinates: [74.4013, 31.4697] },
  "danish-iqbal": { area: "Gulshan-e-Iqbal", coordinates: [67.0971, 24.9207] },
  "hira-noor": { area: "Model Town", coordinates: [74.3239, 31.4834] },
  "farhan-akram": { area: "F-8", coordinates: [73.0398, 33.7102] },
  "mariam-shah": { area: "PECHS", coordinates: [67.0617, 24.8686] },
  "usman-tariq": { area: "Johar Town", coordinates: [74.2728, 31.4697] },
  "nadia-hussain": { area: "Online", coordinates: null },
  "rida-aslam": { area: "Online", coordinates: null },
  "sameer-qureshi": { area: "North Nazimabad", coordinates: [67.0424, 24.9372] },
  "iqra-javed": { area: "I-8", coordinates: [73.0751, 33.6682] },
};

const illustrativeSportImages: Record<string, string> = {
  Badminton: "/images/coach-hira.jpg",
  Basketball: "/images/coach-usman.jpg",
  Boxing: "/images/coach-mariam.jpg",
  Cricket: "/images/coach-ayesha.jpg",
  Football: "/images/coach-danish.jpg",
  Running: "/images/coach-nadia.jpg",
  Strength: "/images/coach-sara.jpg",
  Swimming: "/images/coach-farhan.jpg",
  "Table Tennis": "/images/coach-iqra.jpg",
  Tennis: "/images/coach-hamza.jpg",
  Yoga: "/images/coach-rida.jpg",
};

export function illustrativeImageForSports(sports: readonly string[]) {
  return sports.map((sport) => illustrativeSportImages[sport]).find(Boolean) ?? "/images/hero-training.jpg";
}

export const coaches: Coach[] = baseCoaches.map((coach) => {
  const primarySport = coach.sports[0];
  const isAyesha = coach.id === "ayesha-khan";
  return {
    ...coach,
    tags: ["Beginner friendly", coach.mode === "Online" ? "Remote coaching" : "In-person sessions"],
    badge: "Demo profile",
    image: coach.image ?? illustrativeImageForSports(coach.sports),
    rating: null,
    reviewCount: 0,
    lessonCount: 0,
    credentials: [],
    offersOnline: coach.mode === "Online",
    offersInPerson: coach.mode === "In person",
    ...trainingAreaByCoach[coach.id],
    bio: `${coach.name} helps athletes build useful, repeatable skills without making sessions feel intimidating. ${coach.reason}`,
    experience: "Illustrative coaching background",
    coachingStyle: styleBySport[primarySport],
    languages: isAyesha ? ["English", "Urdu"] : coach.location === "Lahore" ? ["English", "Urdu", "Punjabi"] : ["English", "Urdu"],
    audiences: ["Children", "Teenagers", "Adults", "Seniors"],
    levels: ["Beginner", "Intermediate", "Advanced"],
    lessonPlan: [
      {
        title: "Goal check and warm-up",
        description: "A short check-in, safe movement preparation and one clear goal for the session.",
      },
      {
        title: "Focused skill work",
        description: `Demonstrations and repeatable drills focused on ${coach.specialty.toLowerCase()}.`,
      },
      {
        title: "Guided practice and next steps",
        description: "Apply the skill in a realistic exercise, then leave with focused feedback and a simple practice target.",
      },
    ],
    isDemo: true,
    faqs: [
      {
        question: "Is this suitable for someone new to the sport?",
        answer: "Yes. Sessions are adapted to the athlete's current ability, confidence and goals.",
      },
      {
        question: "What should I bring?",
        answer: "Bring water, comfortable sportswear and any personal equipment you already use. Venue-specific requirements are confirmed before the lesson.",
      },
      {
        question: "How long is each lesson?",
        answer: "The listed price covers one 60-minute lesson unless a different duration is agreed during booking.",
      },
    ],
  };
});

export const allSports: Sport[] = Array.from(new Set(coaches.flatMap((coach) => coach.sports))).sort();

export const formatCoachPrice = (price: number) => `Rs ${price.toLocaleString("en-PK")}`;
