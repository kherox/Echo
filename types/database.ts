export type Profile = {
  id: string;
  first_name: string;
  birth_year: number | null;
  tone_preference: 'formal' | 'familiar';
  consent_at: string;
  family_alert_on: boolean;
  created_at: string;
};

export type Memory = {
  id: string;
  profile_id: string;
  content: string;
  embedding: number[];
  theme: string[] | null;
  emotion_score: number | null;
  last_used_at: string | null;
  created_at: string;
};

export type Session = {
  id: string;
  profile_id: string;
  started_at: string;
  ended_at: string | null;
  wellbeing_flag: boolean;
  duration_s: number | null;
};
