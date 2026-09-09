import { type WheelColumnId } from '../../../domain/wheelDateModel';

export const WHEEL_ITEM_HEIGHT = 48;
export const WHEEL_VISIBLE_COUNT = 5;
export const WHEEL_CONTAINER_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_COUNT; // 240
export const WHEEL_GUTTER = Math.floor(WHEEL_VISIBLE_COUNT / 2); // 2 -> paddingVertical = 96
export const WHEEL_PADDING_VERTICAL = WHEEL_ITEM_HEIGHT * WHEEL_GUTTER; // 96

export const SELECTION_LINE_TOP_1 = WHEEL_PADDING_VERTICAL; // 96
export const SELECTION_LINE_TOP_2 = WHEEL_PADDING_VERTICAL + WHEEL_ITEM_HEIGHT; // 144

export const COLUMN_WIDTHS: Record<WheelColumnId, number> = {
  day: 68,
  month: 92,
  year: 104,
};

export const VELOCITY_SETTLE_THRESHOLD = 0.05;
export const HAPTIC_MIN_INTERVAL_MS = 70;

export type WheelItemTier = 0 | 1 | 2;

export function tierFor(distance: number): WheelItemTier {
  return distance <= 0 ? 0 : distance === 1 ? 1 : 2;
}

export const TIER_STYLE: Record<
  WheelItemTier,
  { fontSize: number; fontWeight: '700' | '500' | '400' }
> = {
  0: { fontSize: 28, fontWeight: '700' },
  1: { fontSize: 20, fontWeight: '500' },
  2: { fontSize: 16, fontWeight: '400' },
};
