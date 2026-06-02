export interface User {
  id: string;
  name: string;
  role: "ADMIN" | "USER";
  points: number;
}