import type { User, Question, Transaction, ActivityItem, AIModel, AdminUser } from "@/types";

const ethiopianNames = [
  { name: "Abebe Kebede", email: "abebe.k@email.com", phone: "+251911234567" },
  { name: "Genet Mulugeta", email: "genet.m@email.com", phone: "+251912345678" },
  { name: "Dawit Tesfaye", email: "dawit.t@email.com", phone: "+251913456789" },
  { name: "Selam Awash", email: "selam.a@email.com", phone: "+251914567890" },
  { name: "Michael Belay", email: "michael.b@email.com", phone: "+251915678901" },
  { name: "Tsion Gebre", email: "tsion.g@email.com", phone: "+251916789012" },
  { name: "Yonas Worku", email: "yonas.w@email.com", phone: "+251917890123" },
  { name: "Meron Desta", email: "meron.d@email.com", phone: "+251918901234" },
  { name: "Henok Tekle", email: "henok.t@email.com", phone: "+251919012345" },
  { name: "Bethlehem Solomon", email: "beth.s@email.com", phone: "+251920123456" },
  { name: "Kidist Haile", email: "kidist.h@email.com", phone: "+251921234567" },
  { name: "Biniam Tadesse", email: "biniam.t@email.com", phone: "+251922345678" },
  { name: "Hana Alemu", email: "hana.a@email.com", phone: "+251923456789" },
  { name: "Ermias Negash", email: "ermias.n@email.com", phone: "+251924567890" },
  { name: "Liya Mengistu", email: "liya.m@email.com", phone: "+251925678901" },
  { name: "Samuel Girma", email: "samuel.g@email.com", phone: "+251926789012" },
  { name: "Tigist Bekele", email: "tigist.b@email.com", phone: "+251927890123" },
  { name: "Nahom Assefa", email: "nahom.a@email.com", phone: "+251928901234" },
  { name: "Rahel Gebremedhin", email: "rahel.g@email.com", phone: "+251929012345" },
  { name: "Kaleab Dereje", email: "kaleab.d@email.com", phone: "+251930123456" },
  { name: "Sara Mekonnen", email: "sara.m@email.com", phone: "+251931234567" },
  { name: "Fitsum Wolde", email: "fitsum.w@email.com", phone: "+251932345678" },
  { name: "Eyerusalem Teshome", email: "eyeru.t@email.com", phone: "+251933456789" },
  { name: "Abel Shiferaw", email: "abel.s@email.com", phone: "+251934567890" },
  { name: "Meseret Desta", email: "meseret.d@email.com", phone: "+251935678901" },
  { name: "Yared Ayele", email: "yared.a@email.com", phone: "+251936789012" },
  { name: "Almaz Berhanu", email: "almaz.b@email.com", phone: "+251937890123" },
  { name: "Daniel Fikre", email: "daniel.f@email.com", phone: "+251938901234" },
  { name: "Feven Zewde", email: "feven.z@email.com", phone: "+251939012345" },
  { name: "Tewodros Hailu", email: "tewodros.h@email.com", phone: "+251940123456" },
  { name: "Mahlet Woldemariam", email: "mahlet.w@email.com", phone: "+251941234567" },
  { name: "Robel Gebru", email: "robel.g@email.com", phone: "+251942345678" },
  { name: "Eleni Abera", email: "eleni.a@email.com", phone: "+251943456789" },
  { name: "Amanuel Berhe", email: "amanuel.b@email.com", phone: "+251944567890" },
  { name: "Selamawit Gebre", email: "selamawit.g@email.com", phone: "+251945678901" },
  { name: "Biruk Tadesse", email: "biruk.t@email.com", phone: "+251946789012" },
  { name: "Helen Demeke", email: "helen.d@email.com", phone: "+251947890123" },
  { name: "Natnael Asfaw", email: "natnael.a@email.com", phone: "+251948901234" },
  { name: "Ruth Tefera", email: "ruth.t@email.com", phone: "+251949012345" },
  { name: "Solomon Kebede", email: "solomon.k@email.com", phone: "+251950123456" },
  { name: "Bezawit Girma", email: "bezawit.g@email.com", phone: "+251951234567" },
  { name: "Yonatan Assefa", email: "yonatan.a@email.com", phone: "+251952345678" },
  { name: "Mekdes Haile", email: "mekdes.h@email.com", phone: "+251953456789" },
  { name: "Kirubel Negash", email: "kirubel.n@email.com", phone: "+251954567890" },
  { name: "Rediet Mekonnen", email: "rediet.m@email.com", phone: "+251955678901" },
  { name: "Addis Worku", email: "addis.w@email.com", phone: "+251956789012" },
  { name: "Nardos Bekele", email: "nardos.b@email.com", phone: "+251957890123" },
  { name: "Eyob Tekle", email: "eyob.t@email.com", phone: "+251958901234" },
  { name: "Blen Alemu", email: "blen.a@email.com", phone: "+251959012345" },
  { name: "Dagmawi Solomon", email: "dagmawi.s@email.com", phone: "+251960123456" },
];

const grades: (6 | 8 | 12)[] = [6, 8, 12];
const statuses: ("premium" | "free" | "trial")[] = ["premium", "free", "trial"];
const subjects = ["Mathematics", "Physics", "English", "Biology", "Chemistry", "History", "Geography"];
const difficulties: ("Easy" | "Medium" | "Hard")[] = ["Easy", "Medium", "Hard"];
const topicsBySubject: Record<string, string[]> = {
  Mathematics: ["Algebra", "Geometry", "Trigonometry", "Calculus", "Statistics"],
  Physics: ["Mechanics", "Thermodynamics", "Optics", "Electricity", "Waves"],
  English: ["Grammar", "Reading Comprehension", "Vocabulary", "Writing", "Literature"],
  Biology: ["Cell Biology", "Genetics", "Ecology", "Human Anatomy", "Evolution"],
  Chemistry: ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Biochemistry"],
  History: ["Ancient Ethiopia", "Medieval Period", "Modern Ethiopia", "World History"],
  Geography: ["Physical Geography", "Human Geography", "Ethiopian Geography", "Climate"],
};

export const mockUsers: User[] = ethiopianNames.map((person, i) => ({
  id: `user-${i + 1}`,
  name: person.name,
  email: person.email,
  phone: person.phone,
  grade: grades[i % 3],
  status: statuses[i % 3],
  joinDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
  lastActive: new Date(2025, 2, Math.floor(Math.random() * 25) + 1).toISOString(),
  accuracy: Math.floor(Math.random() * 40) + 55,
  accuracyTrend: Math.floor(Math.random() * 20) - 5,
  subjectAccuracy: {
    Mathematics: Math.floor(Math.random() * 40) + 50,
    Physics: Math.floor(Math.random() * 40) + 45,
    English: Math.floor(Math.random() * 30) + 60,
    Biology: Math.floor(Math.random() * 40) + 50,
    Chemistry: Math.floor(Math.random() * 40) + 45,
  },
  weakTopics: ["Trigonometry", "Thermodynamics", "Grammar"].slice(0, Math.floor(Math.random() * 3) + 1),
  activityLog: [
    { id: `al-${i}-1`, message: "Completed Mathematics quiz", time: "2 hours ago", type: "info" },
    { id: `al-${i}-2`, message: "Answered 15 questions", time: "5 hours ago", type: "info" },
    { id: `al-${i}-3`, message: "Logged in", time: "1 day ago", type: "info" },
  ],
}));

export const mockQuestions: Question[] = Array.from({ length: 120 }, (_, i) => {
  const subject = subjects[i % subjects.length];
  const topics = topicsBySubject[subject];
  return {
    id: `q-${i + 1}`,
    text: `Sample question ${i + 1} about ${subject} - ${topics[i % topics.length]}. What is the correct answer for this problem?`,
    grade: grades[i % 3],
    subject,
    topic: topics[i % topics.length],
    difficulty: difficulties[i % 3],
    options: [
      { label: "A", text: "First option" },
      { label: "B", text: "Second option" },
      { label: "C", text: "Third option" },
      { label: "D", text: "Fourth option" },
    ],
    correctAnswer: "B",
    explanation: `The correct answer is B because of the fundamental principle in ${subject}.`,
    accuracy: Math.floor(Math.random() * 50) + 40,
    attempts: Math.floor(Math.random() * 5000) + 500,
    correctCount: Math.floor(Math.random() * 3000) + 200,
    avgTime: Math.floor(Math.random() * 60) + 20,
  };
});

const methods: Transaction["method"][] = ["Telebirr", "CBE Birr", "M-Pesa"];
const txStatuses: Transaction["status"][] = ["Success", "Success", "Success", "Pending", "Failed"];

export const mockTransactions: Transaction[] = Array.from({ length: 120 }, (_, i) => ({
  id: `tx-${i + 1}`,
  date: new Date(2025, 2, Math.floor(i / 4) + 1).toISOString(),
  userId: `user-${(i % 50) + 1}`,
  userName: ethiopianNames[i % 50].name,
  amount: [49, 99, 199, 299][Math.floor(Math.random() * 4)],
  method: methods[i % 3],
  status: txStatuses[i % 5],
}));

export const recentActivity: ActivityItem[] = [
  { id: "a1", message: "Abebe K. upgraded to premium", time: "2m ago", type: "upgrade" },
  { id: "a2", message: "345 questions answered in last hour", time: "5m ago", type: "info" },
  { id: "a3", message: "AI cost exceeded daily limit", time: "12m ago", type: "alert" },
  { id: "a4", message: "New user registrations: 234 today", time: "30m ago", type: "registration" },
  { id: "a5", message: "Genet M. completed Grade 12 mock exam", time: "45m ago", type: "info" },
  { id: "a6", message: "System backup completed successfully", time: "1h ago", type: "info" },
  { id: "a7", message: "Dawit T. reported a question error", time: "2h ago", type: "alert" },
  { id: "a8", message: "50 new questions added to Grade 8 Math", time: "3h ago", type: "info" },
];

export const userGrowthData = Array.from({ length: 30 }, (_, i) => ({
  day: `Mar ${i + 1}`,
  users: 11000 + Math.floor(Math.random() * 2000) + i * 60,
  premium: 2000 + Math.floor(Math.random() * 400) + i * 12,
}));

// ── Fixed: 12 monthly entries with `month` key to match PaymentsPage ──────────
export const revenueData = [
  { month: "Jan", revenue: 32000, telebirr: 18000, cbe: 9000,  mpesa: 5000 },
  { month: "Feb", revenue: 28500, telebirr: 16000, cbe: 8500,  mpesa: 4000 },
  { month: "Mar", revenue: 35000, telebirr: 20000, cbe: 10000, mpesa: 5000 },
  { month: "Apr", revenue: 31000, telebirr: 17500, cbe: 9000,  mpesa: 4500 },
  { month: "May", revenue: 38000, telebirr: 22000, cbe: 11000, mpesa: 5000 },
  { month: "Jun", revenue: 42000, telebirr: 24000, cbe: 12000, mpesa: 6000 },
  { month: "Jul", revenue: 39000, telebirr: 22500, cbe: 11000, mpesa: 5500 },
  { month: "Aug", revenue: 45000, telebirr: 26000, cbe: 13000, mpesa: 6000 },
  { month: "Sep", revenue: 41000, telebirr: 23500, cbe: 12000, mpesa: 5500 },
  { month: "Oct", revenue: 47000, telebirr: 27000, cbe: 13500, mpesa: 6500 },
  { month: "Nov", revenue: 44000, telebirr: 25000, cbe: 13000, mpesa: 6000 },
  { month: "Dec", revenue: 52000, telebirr: 30000, cbe: 15000, mpesa: 7000 },
];

export const aiCostData = Array.from({ length: 30 }, (_, i) => ({
  day: `Mar ${i + 1}`,
  cost: 280 + Math.floor(Math.random() * 120),
}));

export const aiModels: AIModel[] = [
  { name: "Mistral 7B", avgLatency: "2.3s", successRate: 98.5, costPerRequest: 0.05, dailyRequests: 1234 },
  { name: "PaddleOCR", avgLatency: "1.8s", successRate: 95.2, costPerRequest: 0.02, dailyRequests: 456 },
  { name: "XGBoost", avgLatency: "0.1s", successRate: 99.9, costPerRequest: 0.001, dailyRequests: 12345 },
];

export const adminUsers: AdminUser[] = [
  { id: "admin-1", name: "Abebe Kebede", email: "abebe@aiexamprep.et", role: "Super Admin", lastLogin: "2025-03-25 09:30" },
  { id: "admin-2", name: "Genet Mulugeta", email: "genet@aiexamprep.et", role: "Content Manager", lastLogin: "2025-03-24 14:15" },
  { id: "admin-3", name: "Dawit Tesfaye", email: "dawit@aiexamprep.et", role: "Support", lastLogin: "2025-03-25 08:00" },
];