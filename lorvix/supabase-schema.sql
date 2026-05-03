-- ============================================================
-- LORVIX — Schema Supabase
-- Execute no SQL Editor do Supabase (nessa ordem)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- CLINICS (tenants)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinics (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  logo_url         TEXT,
  primary_color    TEXT DEFAULT '#5C0018',
  secondary_color  TEXT DEFAULT '#9B1040',
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  plan             TEXT DEFAULT 'basic' CHECK (plan IN ('basic','pro','enterprise')),
  is_active        BOOLEAN DEFAULT true,
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- CLINIC USERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id   UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        TEXT DEFAULT 'receptionist'
                CHECK (role IN ('owner','receptionist','doctor')),
  avatar_url  TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Helper: retorna o clinic_id do usuário autenticado
CREATE OR REPLACE FUNCTION get_clinic_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT clinic_id FROM clinic_users WHERE id = auth.uid();
$$;

-- ─────────────────────────────────────────
-- PROFESSIONALS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS professionals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id   UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  specialty   TEXT NOT NULL,
  bio         TEXT,
  avatar_url  TEXT,
  phone       TEXT,
  email       TEXT,
  color       TEXT DEFAULT '#5C0018',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- AVAILABILITY
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS availability (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  slot_duration   INTEGER DEFAULT 30
);

-- ─────────────────────────────────────────
-- SCHEDULE BLOCKS (férias, feriados, etc.)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedule_blocks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  start_datetime  TIMESTAMPTZ NOT NULL,
  end_datetime    TIMESTAMPTZ NOT NULL,
  reason          TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- PATIENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id   UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  full_name   TEXT NOT NULL,
  cpf         TEXT,
  phone       TEXT NOT NULL,
  email       TEXT,
  birth_date  DATE,
  address     TEXT,
  insurance   TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, phone)
);

-- ─────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id      UUID REFERENCES patients(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  service         TEXT NOT NULL,
  start_datetime  TIMESTAMPTZ NOT NULL,
  end_datetime    TIMESTAMPTZ NOT NULL,
  status          TEXT DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  notes           TEXT,
  price           NUMERIC(10,2),
  source          TEXT DEFAULT 'manual'
                    CHECK (source IN ('manual','online','whatsapp')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- WAITLIST
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id      UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  service         TEXT NOT NULL,
  preferred_date  DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- FINANCIAL RECORDS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_records (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id      UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  type           TEXT NOT NULL CHECK (type IN ('income','expense')),
  description    TEXT NOT NULL,
  amount         NUMERIC(10,2) NOT NULL,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  category       TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- NOTIFICATION TEMPLATES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id   UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  type        TEXT NOT NULL
                CHECK (type IN ('confirmation','reminder','cancellation','follow_up')),
  channel     TEXT NOT NULL CHECK (channel IN ('whatsapp','email','sms')),
  body        TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT true
);

-- ─────────────────────────────────────────
-- WHATSAPP CONFIG
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id           UUID UNIQUE REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  instance_name       TEXT NOT NULL,
  api_url             TEXT NOT NULL,
  agent_name          TEXT DEFAULT 'Assistente',
  agent_instructions  TEXT,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- WHATSAPP CONVERSATIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  phone           TEXT NOT NULL,
  patient_id      UUID REFERENCES patients(id) ON DELETE SET NULL,
  messages        JSONB DEFAULT '[]',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- AUDIT LOG (LGPD)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id   UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  table_name  TEXT NOT NULL,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
ALTER TABLE clinics                ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability           ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_blocks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients               ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist               ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log              ENABLE ROW LEVEL SECURITY;

-- Clinics: owner vê e altera sua própria clínica
CREATE POLICY "clinic_select" ON clinics
  FOR SELECT USING (id = get_clinic_id());

CREATE POLICY "clinic_update" ON clinics
  FOR UPDATE USING (id = get_clinic_id());

-- Clinic users: membros veem os colegas da mesma clínica
CREATE POLICY "clinic_users_select" ON clinic_users
  FOR SELECT USING (clinic_id = get_clinic_id());

CREATE POLICY "clinic_users_update_own" ON clinic_users
  FOR UPDATE USING (id = auth.uid());

-- Tabelas com acesso por clinic_id
CREATE POLICY "professionals_all" ON professionals
  FOR ALL USING (clinic_id = get_clinic_id());

CREATE POLICY "availability_all" ON availability
  FOR ALL USING (clinic_id = get_clinic_id());

CREATE POLICY "schedule_blocks_all" ON schedule_blocks
  FOR ALL USING (clinic_id = get_clinic_id());

CREATE POLICY "patients_all" ON patients
  FOR ALL USING (clinic_id = get_clinic_id());

CREATE POLICY "appointments_all" ON appointments
  FOR ALL USING (clinic_id = get_clinic_id());

CREATE POLICY "waitlist_all" ON waitlist
  FOR ALL USING (clinic_id = get_clinic_id());

CREATE POLICY "financial_records_all" ON financial_records
  FOR ALL USING (clinic_id = get_clinic_id());

CREATE POLICY "notification_templates_all" ON notification_templates
  FOR ALL USING (clinic_id = get_clinic_id());

CREATE POLICY "whatsapp_config_all" ON whatsapp_config
  FOR ALL USING (clinic_id = get_clinic_id());

CREATE POLICY "whatsapp_conversations_all" ON whatsapp_conversations
  FOR ALL USING (clinic_id = get_clinic_id());

CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT USING (clinic_id = get_clinic_id());

-- ─────────────────────────────────────────
-- ÍNDICES DE PERFORMANCE
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date  ON appointments(clinic_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_appointments_professional ON appointments(professional_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_appointments_patient      ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone            ON patients(clinic_id, phone);
CREATE INDEX IF NOT EXISTS idx_availability_professional ON availability(professional_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_phone    ON whatsapp_conversations(clinic_id, phone);
CREATE INDEX IF NOT EXISTS idx_audit_log_clinic          ON audit_log(clinic_id, created_at DESC);
