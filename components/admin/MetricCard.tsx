"use client";

import React from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

export default function MetricCard({
  title,
  value,
  subtitle,
  trendData,
  color = '#4f46e5',
  onClick,
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  trendData?: Array<{ date: string; value: number }>;
  color?: string;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full p-5 bg-white rounded-xl shadow flex items-center justify-between text-left hover:shadow-md transition">
      <div>
        <h3 className="text-sm text-gray-500">{title}</h3>
        <div className="text-2xl font-bold mt-1">{value}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
      </div>

      <div className="w-28 h-12">
        {trendData && trendData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="p-3 bg-slate-50 rounded h-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v4a1 1 0 001 1h3M21 7v4a1 1 0 01-1 1h-3" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}
