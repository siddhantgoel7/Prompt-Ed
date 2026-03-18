// Manual mock for recharts — Jest's jsdom environment cannot resolve recharts v3
// because it uses ESM-only exports and SVG/ResizeObserver browser APIs.
// This stub renders lightweight div stand-ins so tests that import components
// using recharts can still mount and assert on surrounding UI without errors.

import * as React from 'react';

const noop = () => null;

export const ResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="recharts-responsive-container">{children}</div>
);
export const PieChart = ({ children }: { children?: React.ReactNode }) => (
  <div data-testid="recharts-pie-chart">{children}</div>
);
export const Pie = noop;
export const Cell = noop;
export const BarChart = ({ children }: { children?: React.ReactNode }) => (
  <div data-testid="recharts-bar-chart">{children}</div>
);
export const Bar = noop;
export const XAxis = noop;
export const YAxis = noop;
export const CartesianGrid = noop;
export const Tooltip = noop;
export const Legend = noop;
