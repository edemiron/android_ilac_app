/**
 * useAlarmQueue tests — Sprint 8 devamı
 * Pure state hook (useState + useEffect).
 */

import { renderHook, act } from '@testing-library/react-native';
import { useAlarmQueue, usePendingAlarmTrigger } from '../../hooks/useAlarmQueue';

describe('useAlarmQueue', () => {
  it('starts with null pendingAlarm', () => {
    const { result } = renderHook(() => useAlarmQueue());
    expect(result.current.pendingAlarm).toBeNull();
  });

  it('setPendingAlarm updates state', () => {
    const { result } = renderHook(() => useAlarmQueue());

    act(() => {
      result.current.setPendingAlarm({
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T10:00:00Z',
      });
    });

    expect(result.current.pendingAlarm).toEqual({
      medicineId: 'med-1',
      reminderTimeId: 'rt-1',
      scheduledTime: '2024-06-25T10:00:00Z',
    });
  });

  it('setPendingAlarm(null) clears state', () => {
    const { result } = renderHook(() => useAlarmQueue());

    act(() => {
      result.current.setPendingAlarm({
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T10:00:00Z',
      });
    });
    expect(result.current.pendingAlarm).not.toBeNull();

    act(() => {
      result.current.setPendingAlarm(null);
    });
    expect(result.current.pendingAlarm).toBeNull();
  });

  it('preserves optional fields (isSnooze, snoozeId, snoozeCount, originalScheduledTime)', () => {
    const { result } = renderHook(() => useAlarmQueue());

    act(() => {
      result.current.setPendingAlarm({
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T10:00:00Z',
        isSnooze: 'true',
        snoozeId: 'snooze-1',
        snoozeCount: '2',
        originalScheduledTime: '2024-06-25T09:00:00Z',
      });
    });

    expect(result.current.pendingAlarm).toMatchObject({
      medicineId: 'med-1',
      isSnooze: 'true',
      snoozeId: 'snooze-1',
      snoozeCount: '2',
    });
  });
});

describe('usePendingAlarmTrigger', () => {
  it('does not trigger when pendingAlarm is null', () => {
    const onTrigger = jest.fn();
    const isReady = jest.fn(() => true);

    renderHook(() => usePendingAlarmTrigger(null, onTrigger, isReady));

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('does not trigger when isReady returns false', () => {
    const onTrigger = jest.fn();
    const isReady = jest.fn(() => false);
    const pendingAlarm = {
      medicineId: 'med-1',
      reminderTimeId: 'rt-1',
      scheduledTime: '2024-06-25T10:00:00Z',
    };

    renderHook(() => usePendingAlarmTrigger(pendingAlarm, onTrigger, isReady));

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('triggers when pendingAlarm is set and isReady returns true', () => {
    const onTrigger = jest.fn();
    const isReady = jest.fn(() => true);
    const pendingAlarm = {
      medicineId: 'med-1',
      reminderTimeId: 'rt-1',
      scheduledTime: '2024-06-25T10:00:00Z',
    };

    renderHook(() => usePendingAlarmTrigger(pendingAlarm, onTrigger, isReady));

    expect(onTrigger).toHaveBeenCalledWith(pendingAlarm);
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('re-triggers when pendingAlarm changes', () => {
    const onTrigger: any = jest.fn();
    const isReady: any = jest.fn(() => true);

    const { rerender } = renderHook(
      (props: any) => usePendingAlarmTrigger(props.data, onTrigger, isReady),
      {
        initialProps: {
          data: {
            medicineId: 'med-1',
            reminderTimeId: 'rt-1',
            scheduledTime: '2024-06-25T10:00:00Z',
          },
        },
      }
    );

    expect(onTrigger).toHaveBeenCalledTimes(1);

    rerender({
      data: {
        medicineId: 'med-2',
        reminderTimeId: 'rt-2',
        scheduledTime: '2024-06-25T11:00:00Z',
      },
    });

    expect(onTrigger).toHaveBeenCalledTimes(2);
  });
});
