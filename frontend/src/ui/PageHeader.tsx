import React from 'react';

type Crumb = { label: string; href?: string };

export function PageHeader({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  filters,
  search,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  search?: React.ReactNode;
}) {
  return (
    <div className="ops-page-header">
      <div className="ops-page-header-main">
        {breadcrumbs.length > 0 ? (
          <div className="ops-breadcrumbs">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="ops-breadcrumb-item">
                {crumb.href ? <a href={crumb.href}>{crumb.label}</a> : crumb.label}
                {index < breadcrumbs.length - 1 ? <span className="ops-breadcrumb-sep">/</span> : null}
              </span>
            ))}
          </div>
        ) : null}
        <h1 className="ops-page-title">{title}</h1>
        {subtitle ? <p className="ops-page-subtitle">{subtitle}</p> : null}
      </div>
      <div className="ops-page-header-tools">
        {search}
        {filters}
        {actions}
      </div>
    </div>
  );
}

export default PageHeader;
