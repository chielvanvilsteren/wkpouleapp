export type Profile = {
  id: string
  display_name: string
  is_admin: boolean
  is_deelnemer: boolean
  created_at: string
}

// ─── Pre-pool ────────────────────────────────────────────────

export type Prediction = {
  id: string
  user_id: string
  selectie: string[]
  basis_xi: string[]
  is_definitief: boolean
  updated_at: string
}

export type MasterUitslag = {
  id: number
  selectie: string[]
  basis_xi: string[]
  inzendingen_open: boolean
  scores_zichtbaar: boolean
  wk_poule_open: boolean
  wk_scores_zichtbaar: boolean
  updated_at: string
}

export type Score = {
  user_id: string
  selectie_punten: number
  basis_xi_punten: number
  totaal: number
  updated_at: string
}

// ─── WK Poule ────────────────────────────────────────────────

export type Match = {
  id: number
  match_number: number
  stage: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3rd' | 'final'
  group_name: string | null
  home_team: string
  away_team: string
  match_date: string
  home_score: number | null
  away_score: number | null
  is_finished: boolean
}

export type MatchPrediction = {
  id: string
  user_id: string
  match_id: number
  home_score: number
  away_score: number
}

export type WkIncidentsPrediction = {
  user_id: string
  rode_kaart: string
  gele_kaart: string
  geblesseerde: string
  eerste_goal_nl: string
  topscorer_wk: string
  is_definitief: boolean
  updated_at: string
}

export type WkIncidentsUitslag = {
  id: 1
  rode_kaart: string
  gele_kaart: string
  geblesseerde: string
  eerste_goal_nl: string
  topscorer_wk: string
  updated_at: string
}

export type WkScore = {
  user_id: string
  match_punten: number
  incidents_punten: number
  topscorer_punten: number
  totaal: number
  updated_at: string
}

// ─── Ranglijst ───────────────────────────────────────────────

export type RanglijstEntry = {
  user_id: string
  display_name: string
  // pre-pool
  selectie_punten: number | null
  basis_xi_punten: number | null
  pre_totaal: number | null
  // wk poule
  match_punten: number | null
  incidents_punten: number | null
  topscorer_punten: number | null
  wk_totaal: number | null
  // combined
  totaal: number | null
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id'>>
        Relationships: []
      }
      predictions: {
        Row: Prediction
        Insert: Omit<Prediction, 'id' | 'updated_at'>
        Update: Partial<Omit<Prediction, 'id' | 'user_id'>>
        Relationships: []
      }
      master_uitslag: {
        Row: MasterUitslag
        Insert: Partial<MasterUitslag>
        Update: Partial<Omit<MasterUitslag, 'id'>>
        Relationships: []
      }
      scores: {
        Row: Score
        Insert: Score
        Update: Partial<Score>
        Relationships: []
      }
      matches: {
        Row: Match
        Insert: Omit<Match, 'id'>
        Update: Partial<Omit<Match, 'id'>>
        Relationships: []
      }
      match_predictions: {
        Row: MatchPrediction
        Insert: Omit<MatchPrediction, 'id'>
        Update: Partial<Omit<MatchPrediction, 'id' | 'user_id'>>
        Relationships: []
      }
      wk_incidents_predictions: {
        Row: WkIncidentsPrediction
        Insert: WkIncidentsPrediction
        Update: Partial<Omit<WkIncidentsPrediction, 'user_id'>>
        Relationships: []
      }
      wk_incidents_uitslag: {
        Row: WkIncidentsUitslag
        Insert: Partial<WkIncidentsUitslag>
        Update: Partial<Omit<WkIncidentsUitslag, 'id'>>
        Relationships: []
      }
      wk_scores: {
        Row: WkScore
        Insert: WkScore
        Update: Partial<WkScore>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
