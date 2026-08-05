export type Coach = {
  id: string;
  name: string;
  location: "Islamabad" | "Karachi" | "Lahore";
  sport: "Cricket" | "Strength" | "Tennis";
  specialty: string;
  rating: number;
  reviewCount: number;
  price: number;
  reason: string;
  badge: string;
  mode: "In person" | "Online";
  availability: string[];
  image: string;
  rank: number;
};

export const coaches: Coach[] = [
  {
    id: "ayesha-khan",
    name: "Ayesha Khan",
    location: "Lahore",
    sport: "Cricket",
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
    sport: "Tennis",
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
    sport: "Strength",
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
    sport: "Cricket",
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
    sport: "Tennis",
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
    sport: "Strength",
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
];

export const formatCoachPrice = (price: number) => `Rs ${price.toLocaleString("en-PK")}`;
