import { ReactNode } from 'react';
import { ArrowLeft, Home, LayoutDashboard, Shield } from 'lucide-react';

type BackButtonProps = {
  onClick?: () => void;
  label?: string;
};

export function BackButton({ onClick, label = 'Kembali' }: BackButtonProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.history.back();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-slate-600">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <span>/</span>}
          {item.href ? (
            <a
              href={item.href}
              className="hover:text-slate-900 transition-colors"
            >
              {item.label}
            </a>
          ) : (
            <span className="text-slate-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

type NavigationMenuProps = {
  currentPage: 'dashboard' | 'admin';
};

export function NavigationMenu({ currentPage }: NavigationMenuProps) {
  const menuItems = [
    {
      label: 'Home',
      href: '/demo/',
      icon: Home,
      show: true,
    },
    {
      label: 'Dashboard',
      href: '/demo/dashboard',
      icon: LayoutDashboard,
      show: true,
      active: currentPage === 'dashboard',
    },
    {
      label: 'Admin',
      href: '/demo/admin',
      icon: Shield,
      show: true,
      active: currentPage === 'admin',
    },
  ];

  return (
    <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
      {menuItems.filter(item => item.show).map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.label}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              item.active
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Icon size={16} />
            {item.label}
          </a>
        );
      })}
    </div>
  );
}

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showBreadcrumb?: boolean;
  breadcrumbItems?: BreadcrumbItem[];
  showNavigation?: boolean;
  currentPage?: 'dashboard' | 'admin';
  children?: ReactNode;
};

export function PageHeader({
  title,
  subtitle,
  showBack = true,
  showBreadcrumb = false,
  breadcrumbItems = [],
  showNavigation = false,
  currentPage,
  children,
}: PageHeaderProps) {
  return (
    <div className="mb-6 space-y-4">
      {showBack && <BackButton />}
      
      {showBreadcrumb && breadcrumbItems.length > 0 && (
        <Breadcrumb items={breadcrumbItems} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-slate-600">{subtitle}</p>
          )}
        </div>
        {children}
      </div>

      {showNavigation && currentPage && (
        <NavigationMenu currentPage={currentPage} />
      )}
    </div>
  );
}
