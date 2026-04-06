-- Sea Regent: ships (login per ship), sessions, data tables, password change log
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ships: login_id is what users type; Supabase Auth uses a synthetic email per login_id (see SHIP_AUTH_EMAIL_DOMAIN).
CREATE TABLE IF NOT EXISTS ships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  login_id VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  auth_user_id UUID UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'ship' CHECK (role IN ('ship', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ships_auth_user_id ON ships(auth_user_id);

-- Active sessions for "who is logged in"
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ship_id UUID NOT NULL REFERENCES ships(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_ship_id ON sessions(ship_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Password change log (admin gets informed)
CREATE TABLE IF NOT EXISTS password_change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ship_id UUID NOT NULL REFERENCES ships(id),
  changed_at TIMESTAMPTZ DEFAULT now(),
  admin_notified BOOLEAN DEFAULT false
);

-- Data tables: all have ship_id and created_at (for 3-day edit rule)
CREATE TABLE IF NOT EXISTS cargo_receiving (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ship_id UUID NOT NULL REFERENCES ships(id),
  ship_name_other VARCHAR(100),
  date DATE,
  "from" VARCHAR(100),
  location VARCHAR(255),
  remark TEXT,
  white_ig DECIMAL(20,4),
  white_mt DECIMAL(20,4),
  white_price_aed DECIMAL(20,2),
  yellow_ig DECIMAL(20,4),
  yellow_mt DECIMAL(20,4),
  yellow_price_aed DECIMAL(20,2),
  attachment_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cargo_receiving_ship_id ON cargo_receiving(ship_id);
CREATE INDEX IF NOT EXISTS idx_cargo_receiving_created_at ON cargo_receiving(created_at);

CREATE TABLE IF NOT EXISTS purchase (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ship_id UUID NOT NULL REFERENCES ships(id),
  date DATE,
  location VARCHAR(255),
  remark TEXT,
  white_ig DECIMAL(20,4),
  white_mt DECIMAL(20,4),
  yellow_ig DECIMAL(20,4),
  yellow_mt DECIMAL(20,4),
  attachment_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchase_ship_id ON purchase(ship_id);

CREATE TABLE IF NOT EXISTS sale (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ship_id UUID NOT NULL REFERENCES ships(id),
  date DATE,
  location VARCHAR(255),
  remark TEXT,
  whom VARCHAR(255),
  white_ig DECIMAL(20,4),
  white_mt DECIMAL(20,4),
  yellow_ig DECIMAL(20,4),
  yellow_mt DECIMAL(20,4),
  attachment_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sale_ship_id ON sale(ship_id);

CREATE TABLE IF NOT EXISTS internal_discharge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ship_id UUID NOT NULL REFERENCES ships(id),
  ship_name_other VARCHAR(100),
  date DATE,
  "to" VARCHAR(100),
  location VARCHAR(255),
  remark TEXT,
  white_ig DECIMAL(20,4),
  white_mt DECIMAL(20,4),
  yellow_ig DECIMAL(20,4),
  yellow_mt DECIMAL(20,4),
  attachment_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_internal_discharge_ship_id ON internal_discharge(ship_id);

-- Cash Receiving: cash is received by ship_id, from_ship is the counterparty
CREATE TABLE IF NOT EXISTS cash_receiving (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ship_id UUID NOT NULL REFERENCES ships(id),
  date DATE,
  from_ship VARCHAR(100),
  location VARCHAR(255),
  remark TEXT,
  amount_aed DECIMAL(20,2),
  attachment_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cash_receiving_ship_id ON cash_receiving(ship_id);
CREATE INDEX IF NOT EXISTS idx_cash_receiving_created_at ON cash_receiving(created_at);

CREATE TABLE IF NOT EXISTS case_receiving (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ship_id UUID NOT NULL REFERENCES ships(id),
  ship_name_other VARCHAR(100),
  date DATE,
  "from" VARCHAR(100),
  location VARCHAR(255),
  remark TEXT,
  white_ig DECIMAL(20,4),
  white_mt DECIMAL(20,4),
  yellow_ig DECIMAL(20,4),
  yellow_mt DECIMAL(20,4),
  attachment_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_case_receiving_ship_id ON case_receiving(ship_id);

CREATE TABLE IF NOT EXISTS case_discharge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ship_id UUID NOT NULL REFERENCES ships(id),
  ship_name_other VARCHAR(100),
  date DATE,
  "to" VARCHAR(100),
  location VARCHAR(255),
  remark TEXT,
  white_ig DECIMAL(20,4),
  white_mt DECIMAL(20,4),
  yellow_ig DECIMAL(20,4),
  yellow_mt DECIMAL(20,4),
  attachment_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_case_discharge_ship_id ON case_discharge(ship_id);

-- Cash Discharge: cash is discharged by ship_id, to_ship is the counterparty
CREATE TABLE IF NOT EXISTS cash_discharge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ship_id UUID NOT NULL REFERENCES ships(id),
  date DATE,
  to_ship VARCHAR(100),
  location VARCHAR(255),
  remark TEXT,
  amount_aed DECIMAL(20,2),
  attachment_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cash_discharge_ship_id ON cash_discharge(ship_id);
CREATE INDEX IF NOT EXISTS idx_cash_discharge_created_at ON cash_discharge(created_at);

-- Mapping table for automatically mirrored records (to keep stock consistent)
CREATE TABLE IF NOT EXISTS mirrors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type VARCHAR(50) NOT NULL,
  source_id UUID NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_type, source_id)
);

-- Cross-ship transfers: counterpart or admin must confirm before mirror row is created
CREATE TABLE IF NOT EXISTS mirror_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiator_ship_id UUID NOT NULL REFERENCES ships(id) ON DELETE CASCADE,
  counterpart_ship_id UUID NOT NULL REFERENCES ships(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
  source_id UUID NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  confirmed_by VARCHAR(20)
    CHECK (confirmed_by IS NULL OR confirmed_by IN ('counterparty', 'admin')),
  confirmed_at TIMESTAMPTZ,
  target_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mirror_proposals_one_pending_per_source
  ON mirror_proposals (source_type, source_id)
  WHERE (status = 'pending');
CREATE INDEX IF NOT EXISTS idx_mirror_proposals_counterpart_pending
  ON mirror_proposals (counterpart_ship_id) WHERE (status = 'pending');
CREATE INDEX IF NOT EXISTS idx_mirror_proposals_initiator
  ON mirror_proposals (initiator_ship_id);

CREATE TABLE IF NOT EXISTS ship_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ship_id UUID NOT NULL REFERENCES ships(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES mirror_proposals(id) ON DELETE SET NULL,
  kind VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ship_notifications_ship_created
  ON ship_notifications (ship_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ship_notifications_unread
  ON ship_notifications (ship_id) WHERE (read_at IS NULL);

-- Existing deployments: add Supabase Auth link + nullable password (idempotent)
ALTER TABLE ships ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;
CREATE INDEX IF NOT EXISTS idx_ships_auth_user_id ON ships(auth_user_id);
ALTER TABLE ships ALTER COLUMN password_hash DROP NOT NULL;
