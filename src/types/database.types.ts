// Hand-written to match supabase/migrations/0001_init.sql exactly.
// If the schema changes, update this file in the same commit.
//
// NOTE: these are `type` aliases, not `interface`s, on purpose — supabase-js's
// generic Database constraint checks (Row extends Record<string, unknown>, etc.)
// don't structurally match plain interfaces the same way, and resolve to `never`.

export type UserRole = 'admin' | 'investor'
export type InviteStatus = 'pending' | 'accepted'

export type InvestorAccount = {
  id: string
  display_name: string
  created_at: string
  updated_at: string
}

export type InvestorUser = {
  id: string
  investor_account_id: string | null
  name: string
  email: string
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  suburb_city: string | null
  region: string | null
  postcode: string | null
  country: string
  role: UserRole
  is_active: boolean
  invite_status: InviteStatus
  invite_link: string | null
  invite_generated_at: string | null
  created_at: string
  updated_at: string
}

export type Property = {
  id: string
  name: string
  location: string
  description: string
  total_value: number
  valuation_date: string
  initial_investment_amount: number | null
  type: string
  size: string | null
  occupancy: string | null
  year_built: number | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export type PropertyPhoto = {
  id: string
  property_id: string
  storage_path: string
  title: string
  taken_or_added_date: string
  is_cover: boolean
  sort_order: number
  created_at: string
}

export type InvestorProperty = {
  id: string
  investor_account_id: string
  property_id: string
  ownership_pct: number
  invested_amount: number
  created_at: string
  updated_at: string
}

export type InvestorHolding = {
  investor_property_id: string
  investor_account_id: string
  property_id: string
  ownership_pct: number
  invested_amount: number
  total_value: number
  valuation_date: string
  current_asset_value: number
}

export type DocumentCategory = {
  id: string
  name: string
  badge_bg: string
  badge_text: string
  sort_order: number
  created_at: string
}

export type DocumentRow = {
  id: string
  property_id: string
  category_id: string
  name: string
  storage_path: string
  mime_type: string | null
  file_size_bytes: number | null
  date_added: string
  created_at: string
  updated_at: string
}

export type Notice = {
  id: string
  property_id: string
  title: string
  description: string
  notice_date: string
  created_at: string
  updated_at: string
}

export type SiteSettings = {
  id: number
  logo_storage_path: string | null
  badge_storage_path: string | null
  company_name: string
  company_tagline: string
  login_background_storage_path: string | null
  login_heading: string
  login_subtext: string
  login_contact_email: string
  updated_at: string
}

type TableDef<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] }
type ViewDef<Row> = { Row: Row; Relationships: [] }

export type Database = {
  public: {
    Tables: {
      investor_accounts: TableDef<InvestorAccount>
      investor_users: TableDef<InvestorUser>
      properties: TableDef<Property>
      property_photos: TableDef<PropertyPhoto>
      investor_properties: TableDef<InvestorProperty>
      document_categories: TableDef<DocumentCategory>
      documents: TableDef<DocumentRow>
      notices: TableDef<Notice>
      site_settings: TableDef<SiteSettings>
    }
    Views: {
      investor_holdings: ViewDef<InvestorHolding>
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
