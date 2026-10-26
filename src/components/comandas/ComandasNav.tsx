import { NavLink } from 'react-router-dom';
import { ChefHat, Receipt, UtensilsCrossed } from 'lucide-react';

const links = [
  { to: '/comandas', icon: UtensilsCrossed, label: 'Mesera', end: true },
  { to: '/comandas/cocina', icon: ChefHat, label: 'Cocina', end: false },
  { to: '/comandas/caja', icon: Receipt, label: 'Caja', end: false },
];

export const ComandasNav = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
    <div className="px-4 py-3">
      <h1 className="font-display font-bold text-lg">{title}</h1>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
    <nav className="flex border-t">
      {links.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`
          }
        >
          <Icon className="w-4 h-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  </header>
);
