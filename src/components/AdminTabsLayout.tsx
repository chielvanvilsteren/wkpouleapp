'use client'

import { useState } from 'react'

type Tab = {
  key: string
  label: string
  badge?: number
}

type Props = {
  tabs: Tab[]
  children: React.ReactNode[]
}

export default function AdminTabsLayout({ tabs, children }: Props) {
  const [active, setActive] = useState(tabs[0].key)
  const activeIndex = tabs.findIndex((t) => t.key === active)

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-8 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              active === tab.key
                ? 'border-knvb-500 text-knvb-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {children[activeIndex]}
    </div>
  )
}
