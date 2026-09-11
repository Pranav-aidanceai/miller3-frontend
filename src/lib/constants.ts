import {
  Search, LayoutDashboard,
  Users, DollarSign, Database,
  Sparkles, History,
  Eye, PaintBucket, ClipboardList, ClipboardCheck, Building2,
  Tag, Coins, LogOut
} from "lucide-react";

// Copy matches the Figma "Select Plan" reference (fileKey
// pskj0D4uvWBsvAB5Csxyt4, node 424:2234) exactly — see
// src/app/auth/register/Onboarding.tsx's plan-selection step.
export const tiers = [
  {
    role: 'Free',
    label: 'Free Plan',
    price: '$0/month',
    description: 'Start your journey with Vendor Lens at no cost. Ideal for testing out our essential features.',
    desc1: '10 Normal Searches/min',
    desc2: 'No AI search available',
    desc3: 'No Enrichment available',
    highlighted: false,
  },
  {
    role: 'Standard',
    label: 'Standard Plan',
    price: '$20/month',
    description: 'Start your journey as a standard user with Vendor Lens at just $20/month.',
    desc1: '30 Normal Searches/min',
    desc2: '10 AI search /min',
    desc3: '5 Enrichment request/min',
    highlighted: false,
  },
  {
    role: 'Premium',
    label: 'Premium Plan',
    price: '$50/month',
    description: 'Start your journey as a Premium user with Vendor Lens at just $50/month.',
    desc1: '60 Normal Searches/min',
    desc2: '20 AI search /min',
    desc3: '10 Enrichment request/min',
    highlighted: true,
  },
];

export const mainNav = [
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/ai-search', icon: Sparkles, label: 'AI Search' },
  // Figma's sidebar frame (fileKey nPLWw73lkfNSi2MZX2bIsU, node 2:15818)
  // literally reads "Bucket List" — supersedes the earlier "Preferred List" name.
  { to: '/buckets', icon: PaintBucket, label: 'Preferred List' },
  { to: '/query-history', icon: History, label: 'Search History' },
  // { to: '/my-requests', icon: ClipboardList, label: 'My Requests' },
];

export const adminNav = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  // { to: '/admin/errors', icon: AlertTriangle, label: 'Errors' },
  { to: '/admin/cost-centre', icon: DollarSign, label: 'Cost Center' },
  { to: '/admin/data-health', icon: Database, label: 'Data Health' },
  { to: '/admin/search-oversight', icon: Eye, label: 'Search Oversight' },
  // { to: '/admin/company-requests', icon: ClipboardCheck, label: 'Company Requests' },
  { to: '/admin/add-company', icon: Building2, label: 'Add Company' }
];


// Credit top-up packs, biggest first, per the Figma "Buy your Credit Pack"
// screen (fileKey nPLWw73lkfNSi2MZX2bIsU, node 2:18114). Prices aren't shown
// there — the pack is identified by its tier and credit count alone.
export const creditPacks = [
  { tier: 'Tier 1', credits: 1500, highlighted: true },
  { tier: 'Tier 2', credits: 1000, highlighted: false },
  { tier: 'Tier 3', credits: 500, highlighted: false },
  { tier: 'Tier 4', credits: 100, highlighted: false },
] as const;

export const accountMenu = [
  { key: 'plan', icon: Tag, label: 'My Plan', to: '/plan' },
  { key: 'buy-credits', icon: Coins, label: 'Buy Credits', to: '/buy-credits' },
  // { key: 'request-changes', icon: ClipboardList, label: 'Request Changes', to: '/my-requests' },
  { key: 'logout', icon: LogOut, label: 'Logout', variant: 'destructive' },
] as const;

export type AccountMenuKey = typeof accountMenu[number]['key'];

export const roleBadgeColor: Record<string, string> = {
  ADMIN: 'bg-destructive/10 text-destructive',
  PREMIUM: 'bg-primary/10 text-primary',
  STANDARD: 'bg-warning/10 text-warning',
  FREE: 'bg-muted text-muted-foreground',
};

export const statesList = ['AL', 'AZ', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'IL', 'IN', 'KY', 'LA', 'MA', 'MD', 'MI', 'MN', 'MO', 'NC', 'NJ', 'NY', 'OH', 'OK', 'OR', 'PA', 'SC', 'TN', 'TX', 'UT', 'VA', 'WA', 'WI'];