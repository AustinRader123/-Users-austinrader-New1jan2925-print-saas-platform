import React from 'react';

export function Tabs({
  tabs,
  initialKey,
}: {
  tabs: Array<{ key: string; label: string; content: React.ReactNode }>;
  initialKey?: string;
}) {
  const [active, setActive] = React.useState(initialKey || tabs[0]?.key || '');
  const current = tabs.find((tab) => tab.key === active) || tabs[0];

  return (
    <div className="ops-tabs">
      <div className="ops-tabs-list">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`ops-tab ${tab.key === current?.key ? 'is-active' : ''}`}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="ops-tabs-panel">{current?.content}</div>
    </div>
  );
}

export default Tabs;
