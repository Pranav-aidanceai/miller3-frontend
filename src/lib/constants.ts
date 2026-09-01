import {
  Search, LayoutDashboard,
  Users, DollarSign, Database,
  Sparkles, History,
  Eye, Folder, ClipboardList, ClipboardCheck, Building2
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
  { to: '/buckets', icon: Folder, label: 'My Buckets' },
  { to: '/query-history', icon: History, label: 'Query History' },
  { to: '/my-requests', icon: ClipboardList, label: 'My Requests' },
];

export const adminNav = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  // { to: '/admin/errors', icon: AlertTriangle, label: 'Errors' },
  { to: '/admin/cost-centre', icon: DollarSign, label: 'Cost Center' },
  { to: '/admin/data-health', icon: Database, label: 'Data Health' },
  { to: '/admin/search-oversight', icon: Eye, label: 'Search Oversight' },
  { to: '/admin/company-requests', icon: ClipboardCheck, label: 'Company Requests' },
  { to: '/admin/add-company', icon: Building2, label: 'Add Company' }
];

export const roleBadgeColor: Record<string, string> = {
  ADMIN: 'bg-destructive/10 text-destructive',
  PREMIUM: 'bg-primary/10 text-primary',
  STANDARD: 'bg-warning/10 text-warning',
  FREE: 'bg-muted text-muted-foreground',
};

export const statesList = ['AL', 'AZ', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'IL', 'IN', 'KY', 'LA', 'MA', 'MD', 'MI', 'MN', 'MO', 'NC', 'NJ', 'NY', 'OH', 'OK', 'OR', 'PA', 'SC', 'TN', 'TX', 'UT', 'VA', 'WA', 'WI'];