import {
  Crown, Gift, User, Search, LayoutDashboard,
  Users, AlertTriangle, DollarSign, Database, Eye,
} from "lucide-react";

export const tiers = [
  { role: 'Free', label: 'Free', icon: Gift, desc1: '10 Normal searches/min', desc2: 'No AI search available', desc3: 'No enrichment available', color: 'border-border bg-card hover:border-muted-foreground/30', active: 'border-border bg-card border-muted-foreground/30' },
  { role: 'Standard', label: 'Standard', icon: User, desc1: '30 Normal searches/min', desc2: '10 AI searches/min', desc3: '5 Enrichment requests/min', color: 'border-warning/30 bg-warning/5 hover:border-warning/60', active: 'border-warning/30 bg-warning/5 border-warning/60' },
  { role: 'Premium', label: 'Premium', icon: Crown, desc1: '60 Normal searches/min', desc2: '20 AI searches/min', desc3: '10 Enrichment requests/min', color: 'border-primary/30 bg-primary/5 hover:border-primary/60', active: 'border-primary/30 bg-primary/5 border-primary/60' },
];

export const mainNav = [
  { to: '/search', icon: Search, label: 'Search' },
  // { to: '/ai-search', icon: Sparkles, label: 'AI Search' },
  // { to: '/history', icon: History, label: 'Query History' },
  // { to: '/exports', icon: Download, label: 'Exports' },
  // { to: '/enrichment', icon: Zap, label: 'Enrichment' },
];

export const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/errors', icon: AlertTriangle, label: 'Errors' },
  { to: '/admin/costs', icon: DollarSign, label: 'Cost Center' },
  { to: '/admin/data-health', icon: Database, label: 'Data Health' },
  { to: '/admin/searches', icon: Eye, label: 'Search Oversight' },
];

export const roleBadgeColor: Record<string, string> = {
  ADMIN: 'bg-destructive/10 text-destructive',
  PREMIUM: 'bg-primary/10 text-primary',
  STANDARD: 'bg-warning/10 text-warning',
  FREE: 'bg-muted text-muted-foreground',
};