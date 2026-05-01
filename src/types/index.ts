export type Profile = {
  id: string
  display_name: string
  is_admin: boolean
  is_deelnemer: boolean
  created_at: string
}

export type Prediction = {
  id: string
  user_id: string
  selectie: string[]
  basis_xi: string[]
  rode_kaart: string
  gele_kaart: string
  geblesseerde: string
  eerste_goal: string
  is_definitief: boolean
  updated_at: string
}

export type MasterUitslag = {
  id: number
  selectie: string[]
  basis_xi: string[]
  rode_kaart: string
  gele_kaart: string
  geblesseerde: string
  eerste_goal: string
  inzendingen_open: boolean
  scores_zichtbaar: boolean
  updated_at: string
}

export type Score = {
  user_id: string
  selectie_punten: number
  basis_xi_punten: number
  incidenten_punten: number
  totaal: number
  updated_at: string
}

export type RanglijstEntry = {
  user_id: string
  display_name: string
  selectie_punten: number | null
  basis_xi_punten: number | null
  incidenten_punten: number | null
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
