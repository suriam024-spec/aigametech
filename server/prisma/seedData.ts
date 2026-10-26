// ข้อมูลล้วนๆ สำหรับ seed (ไม่ import อะไร) -> แก้ไขง่าย และตรวจด้วย checkData.ts ได้
// หมายเหตุ: ราคา/วันที่/requirements เป็นค่าโดยประมาณเพื่อใช้ demo ในคาบเท่านั้น

export interface CpuGpuSeed {
  name: string;
  tier: number;
  note: string;
}

export interface GameSeed {
  name: string;
  description: string;
  genres: string[];
  tags: string[];
  platforms: string[];
  price: number; // บาท, 0 = ฟรี
  releaseDate: string; // YYYY-MM-DD
  difficulty: "Easy" | "Medium" | "Hard";
  multiplayer: boolean;
  playTime: number; // ชั่วโมงโดยประมาณ
  isIndie: boolean;
  // [cpuTier, gpuTier, ramGb] ; null = ไม่ใช่เกม PC (ข้ามการเช็คสเปค)
  min: [number, number, number] | null;
  rec: [number, number, number] | null;
}

// ---------------------------------------------------------------- CPU (10 รุ่น)
export const CPUS: CpuGpuSeed[] = [
  { name: "Intel Core i3-6100", tier: 1, note: "เครื่องเก่า/ออฟฟิศ เหมาะเกมเบาๆ และเกม 2D" },
  { name: "AMD Athlon 3000G", tier: 1, note: "งบประหยัด เหมาะเกมอินดี้และเกมออนไลน์เบาๆ" },
  { name: "Intel Core i5-7400", tier: 2, note: "เล่นเกมทั่วไปได้ ตั้งกราฟิกกลาง-ต่ำ" },
  { name: "AMD Ryzen 3 3200G", tier: 2, note: "เล่นเกมทั่วไปได้ ตั้งกราฟิกกลาง-ต่ำ" },
  { name: "Intel Core i5-10400F", tier: 3, note: "เข้ากับเกมระดับ 1080p Medium" },
  { name: "AMD Ryzen 5 3600", tier: 3, note: "เข้ากับเกมระดับ 1080p Medium-High" },
  { name: "Intel Core i5-12400F", tier: 4, note: "เล่นเกมใหม่ๆ 1080p High ได้สบาย" },
  { name: "AMD Ryzen 5 5600", tier: 4, note: "เล่นเกมใหม่ๆ 1080p High ได้สบาย" },
  { name: "Intel Core i7-13700K", tier: 5, note: "ระดับสูง เล่นเกมหนักๆ และสตรีมได้" },
  { name: "AMD Ryzen 7 7800X3D", tier: 5, note: "ระดับสูงสุดสำหรับเล่นเกม" },
];

// ---------------------------------------------------------------- GPU (10 รุ่น)
export const GPUS: CpuGpuSeed[] = [
  { name: "Intel UHD Graphics (ออนบอร์ด)", tier: 1, note: "ไม่มีการ์ดจอแยก เหมาะเกม 2D และเกมเบามาก" },
  { name: "NVIDIA GeForce GT 1030", tier: 1, note: "การ์ดจอพื้นฐาน เหมาะเกมอินดี้ 720p" },
  { name: "NVIDIA GeForce GTX 750 Ti", tier: 2, note: "เล่นเกมเก่า-กลาง 1080p Low ได้" },
  { name: "NVIDIA GeForce GTX 1050 Ti", tier: 2, note: "เล่นเกมทั่วไป 1080p Low-Medium" },
  { name: "NVIDIA GeForce GTX 1060 6GB", tier: 3, note: "เข้ากับเกมระดับ 1080p Medium" },
  { name: "NVIDIA GeForce GTX 1650", tier: 3, note: "เข้ากับเกมระดับ 1080p Medium" },
  { name: "NVIDIA GeForce RTX 3060", tier: 4, note: "เล่นเกมใหม่ๆ 1080p High ได้ดี" },
  { name: "AMD Radeon RX 6600", tier: 4, note: "เล่นเกมใหม่ๆ 1080p High ได้ดี" },
  { name: "NVIDIA GeForce RTX 4070", tier: 5, note: "ระดับสูง 1440p High ได้สบาย" },
  { name: "NVIDIA GeForce RTX 4080", tier: 5, note: "ระดับสูงสุด 4K ได้" },
];

// ---------------------------------------------------------------- Games (21 เกม)
// 18 เกม PC (มี requirements) + 3 เกมคอนโซลล้วน (min/rec = null)
const PC_ALL = ["PC", "Switch", "PS5", "Xbox"];

export const GAMES: GameSeed[] = [
  // ----- เกมเบา (เครื่องสเปคต่ำเล่นได้) -----
  {
    name: "Stardew Valley",
    description: "เกมทำฟาร์มสบายๆ ปลูกพืช เลี้ยงสัตว์ ผูกมิตรกับชาวบ้าน และสำรวจเหมืองใต้ดิน เล่นได้ทั้งแบบเรื่อยๆ และจริงจัง",
    genres: ["Simulation", "RPG"],
    tags: ["ผ่อนคลาย", "ทำฟาร์ม", "co-op", "pixel art"],
    platforms: PC_ALL,
    price: 220,
    releaseDate: "2016-02-26",
    difficulty: "Easy",
    multiplayer: true,
    playTime: 50,
    isIndie: true,
    min: [1, 1, 2],
    rec: [1, 1, 4],
  },
  {
    name: "Hades",
    description: "เกมแอ็กชัน Roguelike หนีออกจากยมโลกในบทเจ้าชายซาเกรอุส ต่อสู้เร็ว สนุก และเนื้อเรื่องคืบหน้าทุกครั้งที่ตาย",
    genres: ["Action", "Roguelike"],
    tags: ["เนื้อเรื่องดี", "เทพเจ้ากรีก", "ต่อสู้เร็ว"],
    platforms: PC_ALL,
    price: 410,
    releaseDate: "2020-09-17",
    difficulty: "Medium",
    multiplayer: false,
    playTime: 30,
    isIndie: true,
    min: [1, 1, 4],
    rec: [2, 2, 8],
  },
  {
    name: "Hollow Knight",
    description: "เกมผจญภัยแนว Metroidvania ในอาณาจักรแมลงใต้ดิน โลกกว้าง บรรยากาศมืดสวยงาม และบอสท้าทาย",
    genres: ["Metroidvania", "Action"],
    tags: ["สำรวจ", "บอสยาก", "2D", "บรรยากาศดี"],
    platforms: PC_ALL,
    price: 275,
    releaseDate: "2017-02-24",
    difficulty: "Hard",
    multiplayer: false,
    playTime: 40,
    isIndie: true,
    min: [1, 1, 4],
    rec: [2, 2, 8],
  },
  {
    name: "Terraria",
    description: "เกมแซนด์บ็อกซ์ 2D ขุด สร้าง ต่อสู้บอส และสำรวจโลกที่สุ่มสร้างขึ้นใหม่ เล่นกับเพื่อนได้",
    genres: ["Sandbox", "Adventure"],
    tags: ["co-op", "สร้างบ้าน", "2D", "สำรวจ"],
    platforms: PC_ALL,
    price: 150,
    releaseDate: "2011-05-16",
    difficulty: "Medium",
    multiplayer: true,
    playTime: 60,
    isIndie: true,
    min: [1, 1, 2],
    rec: [2, 1, 4],
  },
  {
    name: "Among Us",
    description: "เกมปาร์ตี้หาตัวคนทรยศบนยานอวกาศ ลูกเรือต้องทำภารกิจและโหวตไล่ผู้ต้องสงสัย เล่นกับเพื่อนสนุกมาก",
    genres: ["Party", "Social Deduction"],
    tags: ["เล่นกับเพื่อน", "ออนไลน์", "เล่นสั้น"],
    platforms: PC_ALL,
    price: 120,
    releaseDate: "2018-06-15",
    difficulty: "Easy",
    multiplayer: true,
    playTime: 20,
    isIndie: true,
    min: [1, 1, 2],
    rec: [1, 1, 4],
  },
  {
    name: "Vampire Survivors",
    description: "เกมเอาตัวรอดจากฝูงมอนสเตอร์ที่ทะลักเข้ามา เก็บอาวุธและอัปเกรดจนจอเต็มไปด้วยเอฟเฟกต์ เล่นแล้วติดมือ",
    genres: ["Roguelike", "Action"],
    tags: ["เล่นสั้น", "ติดมือ", "pixel art"],
    platforms: PC_ALL,
    price: 100,
    releaseDate: "2022-10-20",
    difficulty: "Easy",
    multiplayer: false,
    playTime: 20,
    isIndie: true,
    min: [1, 1, 2],
    rec: [1, 1, 4],
  },
  {
    name: "Celeste",
    description: "เกมแพลตฟอร์มปีนภูเขาเซเลสเต้ ควบคุมแม่นยำ ด่านท้าทาย พร้อมเรื่องราวที่อบอุ่นเกี่ยวกับการก้าวผ่านความกังวล",
    genres: ["Platformer"],
    tags: ["เนื้อเรื่องดี", "ท้าทาย", "2D", "pixel art"],
    platforms: PC_ALL,
    price: 260,
    releaseDate: "2018-01-25",
    difficulty: "Hard",
    multiplayer: false,
    playTime: 10,
    isIndie: true,
    min: [1, 1, 2],
    rec: [1, 1, 4],
  },
  {
    name: "Slay the Spire",
    description: "เกมการ์ดผสม Roguelike สร้างเด็คปีนหอคอยที่เปลี่ยนไปทุกรอบ ต้องวางแผนทุกการ์ดที่เลือก",
    genres: ["Card", "Strategy", "Roguelike"],
    tags: ["วางแผน", "สร้างเด็ค", "เล่นซ้ำได้"],
    platforms: PC_ALL,
    price: 330,
    releaseDate: "2019-01-23",
    difficulty: "Medium",
    multiplayer: false,
    playTime: 40,
    isIndie: true,
    min: [1, 1, 2],
    rec: [1, 1, 4],
  },
  {
    name: "Disco Elysium",
    description: "RPG สืบสวนที่เน้นบทสนทนาและการตัดสินใจ รับบทนักสืบความจำเสื่อมที่ต้องไขคดีในเมืองที่กำลังจะพัง เนื้อเรื่องลึกมาก",
    genres: ["RPG", "Mystery"],
    tags: ["เนื้อเรื่องดี", "เน้นบทสนทนา", "สืบสวน", "อ่านเยอะ"],
    platforms: ["PC", "PS5", "Xbox", "Switch"],
    price: 800,
    releaseDate: "2019-10-15",
    difficulty: "Medium",
    multiplayer: false,
    playTime: 30,
    isIndie: true,
    min: [1, 2, 4],
    rec: [2, 2, 8],
  },

  // ----- เกมออนไลน์ / เกมสเปคกลาง -----
  {
    name: "Valorant",
    description: "เกม FPS ยุทธวิธี 5 ต่อ 5 ผสมความสามารถพิเศษของตัวละคร เน้นการสื่อสารและการเล็งที่แม่นยำ",
    genres: ["FPS", "Tactical"],
    tags: ["ออนไลน์", "แข่งขัน", "เล่นเป็นทีม", "ฟรี"],
    platforms: ["PC"],
    price: 0,
    releaseDate: "2020-06-02",
    difficulty: "Hard",
    multiplayer: true,
    playTime: 100,
    isIndie: false,
    min: [1, 1, 4],
    rec: [2, 2, 8],
  },
  {
    name: "Counter-Strike 2",
    description: "เกม FPS สายแข่งขันระดับตำนาน วางแผนซื้ออาวุธ วางระเบิด/เก็บระเบิด ด้วยกราฟิกและระบบควันรุ่นใหม่",
    genres: ["FPS", "Tactical"],
    tags: ["ออนไลน์", "แข่งขัน", "เล่นเป็นทีม", "ฟรี"],
    platforms: ["PC"],
    price: 0,
    releaseDate: "2023-09-27",
    difficulty: "Hard",
    multiplayer: true,
    playTime: 100,
    isIndie: false,
    min: [2, 2, 8],
    rec: [3, 4, 16],
  },
  {
    name: "Minecraft",
    description: "เกมแซนด์บ็อกซ์โลกบล็อก สร้างอะไรก็ได้ตามจินตนาการ หรือเอาชีวิตรอดในโลกเปิดกว้าง เล่นกับเพื่อนได้",
    genres: ["Sandbox", "Survival"],
    tags: ["สร้างสรรค์", "co-op", "เล่นกับเพื่อน", "โลกเปิด"],
    platforms: PC_ALL,
    price: 700,
    releaseDate: "2011-11-18",
    difficulty: "Easy",
    multiplayer: true,
    playTime: 100,
    isIndie: false,
    min: [1, 1, 4],
    rec: [2, 2, 8],
  },
  {
    name: "Civilization VI",
    description: "เกมวางแผนสร้างอารยธรรมตั้งแต่ยุคหินถึงยุคอวกาศ จัดการเมือง การทูต และสงคราม แบบผลัดตา",
    genres: ["Strategy", "Turn-based"],
    tags: ["วางแผน", "ผลัดตา", "สร้างเมือง", "ติดลืมเวลา"],
    platforms: ["PC", "Switch", "PS5", "Xbox"],
    price: 1290,
    releaseDate: "2016-10-21",
    difficulty: "Medium",
    multiplayer: true,
    playTime: 100,
    isIndie: false,
    min: [2, 2, 4],
    rec: [3, 3, 8],
  },
  {
    name: "The Witcher 3: Wild Hunt",
    description: "RPG โลกเปิดในบทนักล่าปีศาจเกรัลท์ เควสต์ละเอียด เนื้อเรื่องเข้มข้น ตัวเลือกส่งผลต่อโลกของเกม",
    genres: ["RPG", "Action", "Open World"],
    tags: ["เนื้อเรื่องดี", "โลกเปิด", "แฟนตาซี", "เล่นคนเดียว"],
    platforms: ["PC", "PS5", "Xbox", "Switch"],
    price: 400,
    releaseDate: "2015-05-19",
    difficulty: "Medium",
    multiplayer: false,
    playTime: 100,
    isIndie: false,
    min: [2, 2, 6],
    rec: [3, 3, 8],
  },

  // ----- เกมหนัก (เครื่องสเปคต่ำจะไม่ผ่าน -> ใช้ demo AI Upgrade Advisor) -----
  {
    name: "Elden Ring",
    description: "Action RPG โลกเปิดจากผู้สร้าง Dark Souls สำรวจดินแดนระหว่างโลกอย่างอิสระ บอสท้าทาย และเนื้อเรื่องที่ตีความเอง",
    genres: ["RPG", "Action", "Open World"],
    tags: ["โลกเปิด", "ท้าทาย", "แฟนตาซี", "บอสยาก", "souls-like"],
    platforms: ["PC", "PS5", "Xbox"],
    price: 1790,
    releaseDate: "2022-02-25",
    difficulty: "Hard",
    multiplayer: true,
    playTime: 100,
    isIndie: false,
    min: [2, 3, 8],
    rec: [3, 4, 16],
  },
  {
    name: "Cyberpunk 2077",
    description: "RPG ยิงมุมมองบุคคลที่หนึ่งในมหานครไซเบอร์พังก์ Night City เลือกสร้างตัวละครและเส้นทางของตัวเอง",
    genres: ["RPG", "FPS", "Open World"],
    tags: ["เนื้อเรื่องดี", "ไซไฟ", "โลกเปิด", "เล่นคนเดียว"],
    platforms: ["PC", "PS5", "Xbox"],
    price: 1790,
    releaseDate: "2020-12-10",
    difficulty: "Medium",
    multiplayer: false,
    playTime: 60,
    isIndie: false,
    min: [3, 3, 12],
    rec: [4, 4, 16],
  },
  {
    name: "Baldur's Gate 3",
    description: "RPG ผลัดตาแนว D&D เนื้อเรื่องแตกกิ่งก้านมหาศาล ตัวเลือกส่งผลจริง เล่นคนเดียวหรือ co-op ได้",
    genres: ["RPG", "Turn-based", "Strategy"],
    tags: ["เนื้อเรื่องดี", "แฟนตาซี", "co-op", "ผลัดตา"],
    platforms: ["PC", "PS5", "Xbox"],
    price: 1790,
    releaseDate: "2023-08-03",
    difficulty: "Hard",
    multiplayer: true,
    playTime: 120,
    isIndie: false,
    min: [3, 3, 8],
    rec: [4, 4, 16],
  },
  {
    name: "Red Dead Redemption 2",
    description: "เกมแอ็กชันโลกเปิดยุคคาวบอยตะวันตก เรื่องราวของแก๊งนอกกฎหมายที่กำลังล่มสลาย กราฟิกและรายละเอียดระดับสูง",
    genres: ["Action", "Adventure", "Open World"],
    tags: ["เนื้อเรื่องดี", "โลกเปิด", "คาวบอย", "สมจริง"],
    platforms: ["PC", "PS5", "Xbox"],
    price: 1790,
    releaseDate: "2019-11-05",
    difficulty: "Medium",
    multiplayer: true,
    playTime: 80,
    isIndie: false,
    min: [3, 3, 8],
    rec: [4, 4, 12],
  },

  // ----- เกมคอนโซล (ไม่มีบน PC -> ข้ามการเช็คสเปค) -----
  {
    name: "The Legend of Zelda: Tears of the Kingdom",
    description: "เกมผจญภัยโลกเปิดบนท้องฟ้า พื้นดิน และใต้ดินของไฮรูล สร้างยานพาหนะและอุปกรณ์ได้อย่างอิสระ",
    genres: ["Adventure", "Action", "Open World"],
    tags: ["สำรวจ", "สร้างสรรค์", "แฟนตาซี", "เล่นคนเดียว"],
    platforms: ["Switch"],
    price: 2290,
    releaseDate: "2023-05-12",
    difficulty: "Medium",
    multiplayer: false,
    playTime: 100,
    isIndie: false,
    min: null,
    rec: null,
  },
  {
    name: "Mario Kart 8 Deluxe",
    description: "เกมแข่งรถสุดป่วนจากจักรวาลมาริโอ ใช้ไอเทมแกล้งคู่แข่ง เล่นกับเพื่อนในเครื่องเดียวกันหรือออนไลน์ได้",
    genres: ["Racing", "Party"],
    tags: ["เล่นกับเพื่อน", "ครอบครัว", "เล่นสั้น"],
    platforms: ["Switch"],
    price: 1990,
    releaseDate: "2017-04-28",
    difficulty: "Easy",
    multiplayer: true,
    playTime: 30,
    isIndie: false,
    min: null,
    rec: null,
  },
  {
    name: "Astro Bot",
    description: "เกมแพลตฟอร์ม 3D สุดน่ารักบน PS5 พาหุ่นยนต์ตัวจิ๋วผจญภัยข้ามดาวต่างๆ ใช้ฟีเจอร์ของจอยเต็มรูปแบบ",
    genres: ["Platformer", "Adventure"],
    tags: ["น่ารัก", "ครอบครัว", "3D", "เล่นคนเดียว"],
    platforms: ["PS5"],
    price: 1890,
    releaseDate: "2024-09-06",
    difficulty: "Easy",
    multiplayer: false,
    playTime: 15,
    isIndie: false,
    min: null,
    rec: null,
  },
];

// ---------------------------------------------------------------- Demo users
// รหัสผ่านทั้งหมดเป็นของ demo เท่านั้น
export const DEMO_USERS = [
  {
    email: "admin@demo.com",
    password: "admin1234",
    role: "admin",
    spec: null,
  },
  {
    // สเปคต่ำ: tier 2 / tier 2 / 8GB -> ผ่านเกมเบา, หนักๆ ไม่ผ่าน
    email: "low@demo.com",
    password: "demo1234",
    role: "user",
    spec: { cpu: "Intel Core i5-7400", gpu: "NVIDIA GeForce GTX 750 Ti", ramGb: 8 },
  },
  {
    // สเปคสูง: tier 4 / tier 4 / 16GB -> เล่นได้เกือบทุกเกม
    email: "high@demo.com",
    password: "demo1234",
    role: "user",
    spec: { cpu: "AMD Ryzen 5 5600", gpu: "NVIDIA GeForce RTX 3060", ramGb: 16 },
  },
];

// ---------------------------------------------------------------- Demo activity
// daysAgo = กี่วันที่แล้ว (ให้ข้อมูลดูกระจาย)
export interface DemoActivity {
  views: { game: string; daysAgo: number }[];
  favorites: string[];
  searches: { query: string; genres?: string[]; daysAgo: number }[];
}

export const DEMO_ACTIVITY: Record<string, DemoActivity> = {
  // คนสเปคต่ำ: ชอบ RPG/Simulation/อินดี้ + ลองดู Elden Ring ที่ไม่ผ่าน (เอาไว้ demo Upgrade Advisor)
  "low@demo.com": {
    views: [
      { game: "Stardew Valley", daysAgo: 6 },
      { game: "Stardew Valley", daysAgo: 2 },
      { game: "Disco Elysium", daysAgo: 5 },
      { game: "Hades", daysAgo: 4 },
      { game: "The Witcher 3: Wild Hunt", daysAgo: 3 },
      { game: "Elden Ring", daysAgo: 1 },
    ],
    favorites: ["Stardew Valley", "Disco Elysium"],
    searches: [
      { query: "rpg เนื้อเรื่องดี", genres: ["RPG"], daysAgo: 7 },
      { query: "เกมทำฟาร์ม", genres: ["Simulation"], daysAgo: 6 },
    ],
  },
  // คนสเปคสูง: ชอบ FPS/Action
  "high@demo.com": {
    views: [
      { game: "Counter-Strike 2", daysAgo: 7 },
      { game: "Valorant", daysAgo: 6 },
      { game: "Cyberpunk 2077", daysAgo: 4 },
      { game: "Red Dead Redemption 2", daysAgo: 3 },
      { game: "Baldur's Gate 3", daysAgo: 2 },
      { game: "Elden Ring", daysAgo: 1 },
    ],
    favorites: ["Cyberpunk 2077", "Counter-Strike 2", "Elden Ring"],
    searches: [
      { query: "fps แข่งขัน", genres: ["FPS"], daysAgo: 8 },
      { query: "เกมแอ็กชันโลกเปิด", genres: ["Action", "Open World"], daysAgo: 5 },
    ],
  },
};
