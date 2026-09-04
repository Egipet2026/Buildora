-- Примерен бизнес за тестване на Buildora платформата
-- Това е SQL скрипт, който можеш да изпълниш в Supabase SQL Editor

-- 1. Създави примерен профил (продавач)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  'seller-001-test-business',
  'seller@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- 2. Създави профил на продавача
INSERT INTO public.profiles (id, full_name, headline, bio, country, is_verified, verification_status, premium_tier, created_at)
VALUES (
  'seller-001-test-business',
  'Alex Johnson',
  'Experienced SaaS Founder & Business Builder',
  'Successfully scaled 3 B2B SaaS businesses to 6-7 figures ARR. Looking to exit my current project and invest in other founders.',
  'United States',
  true,
  'verified',
  'pro',
  now()
) ON CONFLICT (id) DO NOTHING;

-- 3. Създави примерния бизнес листинг
INSERT INTO public.listings (
  id,
  owner_id,
  kind,
  category_slug,
  title,
  slug,
  summary,
  description,
  country,
  currency,
  price_cents,
  deal_types,
  status,
  is_verified,
  is_featured,
  featured_until,
  views_count,
  saves_count,
  metrics,
  attributes,
  documents,
  created_at,
  published_at
)
VALUES (
  'business-001-saas-demo',
  'seller-001-test-business',
  'business',
  'saas',
  'B2B Analytics SaaS - $15K MRR, Growing 25% MoM',
  'b2b-analytics-saas-15k-mrr',
  'Profitable B2B SaaS platform for product analytics. Bootstrapped, profitable, and actively growing. Looking for buyer who can take it to the next level.',
  'We''ve built a SaaS platform that helps product teams understand user behavior and optimize conversion rates.

**Key Highlights:**
- 150+ active customers paying $99-999/month
- $15,000 MRR with 25% month-over-month growth
- Bootstrapped and entirely self-funded
- Profitable with 65% gross margins
- Founded in 2022, now fully established

**What''s Included:**
- Full source code (Next.js + React)
- Customer database and API integrations
- All vendor accounts (payment processor, hosting, email)
- 12 months of detailed financial records
- Complete documentation for new owner

**Why We''re Selling:**
Founder is transitioning to angel investing and wants to focus on helping other founders build great products. The business is healthy and stable - perfect for someone who wants to own and grow a profitable SaaS company.

**Ideal Buyer:**
- SaaS founder looking to acquire a proven business model
- Investor wanting to operate a cash-generating business
- Team looking to scale an existing product',
  'United States',
  'USD',
  295000,
  ARRAY['purchase'],
  'active',
  true,
  true,
  now() + interval '30 days',
  2547,
  89,
  jsonb_build_object(
    'annual_revenue_cents', 180000,
    'monthly_revenue_cents', 15000,
    'annual_profit_cents', 117000,
    'monthly_profit_cents', 9750,
    'customers', 150,
    'team_size', 2
  ),
  jsonb_build_object(
    'business_model', 'SaaS - Subscription',
    'year_founded', 2022,
    'website', 'https://analytics-example.com',
    'socials', jsonb_build_array(
      jsonb_build_object('label', 'Twitter', 'url', 'https://twitter.com/analyticsexample'),
      jsonb_build_object('label', 'Product Hunt', 'url', 'https://producthunt.com/analyticsexample')
    ),
    'reason_for_selling', 'Founder transitioning to angel investing',
    'assets_included', jsonb_build_array(
      'Source code (GitHub repository)',
      'Customer database',
      'All vendor accounts',
      'Email template library',
      'Financial dashboards',
      'Documentation & runbook'
    ),
    'is_online', true
  ),
  jsonb_build_array(
    jsonb_build_object(
      'name', 'Financial_Statements_2024.pdf',
      'path', 'listings/business-001/financials.pdf',
      'visibility', 'after_offer'
    ),
    jsonb_build_object(
      'name', 'Customer_List.xlsx',
      'path', 'listings/business-001/customers.xlsx',
      'visibility', 'after_offer'
    ),
    jsonb_build_object(
      'name', 'Business_Operations_Guide.pdf',
      'path', 'listings/business-001/guide.pdf',
      'visibility', 'on_request'
    )
  ),
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Проверка: вижда ли се новия листинг
SELECT 
  id,
  title,
  status,
  is_featured,
  price_cents,
  metrics->>'monthly_revenue_cents' as monthly_revenue,
  (metrics->>'customers')::int as customer_count,
  created_at
FROM public.listings
WHERE id = 'business-001-saas-demo';
