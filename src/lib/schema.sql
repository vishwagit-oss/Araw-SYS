-- Sea Regent: ships (login per ship), sessions, data tables, password change log
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ships: each has login_id + password. One admin.
CREATE TABLE IF NOT EXISTS ships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  login_id VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'ship' CHECK (role IN ('ship', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

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
