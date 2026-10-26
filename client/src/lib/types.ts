export type Role = "user" | "admin";
export type User = { id: number; email: string; role: Role };

export type Tier = { cpuTier: number; gpuTier: number; ramGb: number };
export type Gap = { have: number; needMin: number; needRec: number };

export type SpecCheck = {
  status: "smooth" | "minimum" | "fail";
  cpu: "pass" | "fail";
  gpu: "pass" | "fail";
  ram: "pass" | "fail";
  cpuGap: Gap;
  gpuGap: Gap;
  ramGap: Gap;
};

export type GameDto = {
  id: number;
  name: string;
  description: string;
  genres: string[];
  tags: string[];
  platforms: string[];
  price: number;
  releaseDate: string;
  difficulty: "Easy" | "Medium" | "Hard";
  multiplayer: boolean;
  playTime: string | number;
  isIndie: boolean;
  image: string;
  popularity: number;
  isFavorite: boolean;
  requirements: null | { min: Tier; rec: Tier };
  specCheck: null | SpecCheck;
};

export type GameListResponse = { items: GameDto[]; total: number; specReady: boolean };
export type TrendingResponse = { items: GameDto[]; specReady: boolean };
export type GameDetailResponse = GameDto & { similar: GameDto[]; specReady: boolean };
export type FavoritesResponse = GameListResponse;

export type RecommendationsResponse = {
  items: GameDto[];
  specReady: boolean;
  basedOn: "interest" | "popular";
  topGenres: string[];
};

export type AiFilters = {
  genres: string[] | null;
  platforms: string[] | null;
  multiplayer: boolean | null;
  difficulty: string[] | null;
  isIndie: boolean | null;
  maxPrice: number | null;
  tags: string[] | null;
  compatibleWithMySpec: boolean | null;
};

export type AiSearchResponse = {
  items: GameDto[];
  total: number;
  specReady: boolean;
  usedAi: boolean;
  understood: AiFilters | null;
  needSpec: boolean;
  notice: string | null;
};