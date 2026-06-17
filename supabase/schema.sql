CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  referrals_needed_for_retry INT DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  name TEXT NOT NULL,
  probability FLOAT NOT NULL,
  color TEXT NOT NULL
);

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  phone TEXT NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES participants(id),
  spins_available INT DEFAULT 1,
  successful_referrals INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, phone)
);

CREATE TABLE spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  prize_id UUID REFERENCES prizes(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- داده نمونه
INSERT INTO campaigns (name, slug, referrals_needed_for_retry)
VALUES ('کمپین بهار ۱۴۰۴', 'spring-2025', 2);

INSERT INTO prizes (campaign_id, name, probability, color)
SELECT id, name, prob, color FROM campaigns, (VALUES
  ('جایزه ویژه', 5, '#FF6B6B'),
  ('تخفیف ۵۰٪', 20, '#4ECDC4'),
  ('تخفیف ۲۰٪', 35, '#45B7D1'),
  ('شانس بیشتر', 40, '#96CEB4')
) AS p(name, prob, color)
WHERE slug = 'spring-2025';
