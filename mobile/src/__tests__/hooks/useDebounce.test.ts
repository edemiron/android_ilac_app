import { renderHook, act } from '@testing-library/react-native';
import { useDebounce } from '../../hooks/useDebounce';

describe('useDebounce hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('does not update value before delay elapses', () => {
    // Sprint 1: explicit generic kaldirildi — TS strict mode'da
    // renderHook callback type uyumsuzlugu. useDebounce<T> generic'i
    // zaten value parametresinden T'yi cikarimsar.
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 500),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });
    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
  });

  it('resets timer on rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 500),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });
    act(() => jest.advanceTimersByTime(300));
    rerender({ value: 'c' });
    act(() => jest.advanceTimersByTime(300));
    // 600ms toplam gecti ama timer reset — b hala set edilmemis
    expect(result.current).toBe('a');

    act(() => jest.advanceTimersByTime(200));
    expect(result.current).toBe('c');
  });

  it('handles numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => useDebounce(value, 100),
      { initialProps: { value: 0 } }
    );

    rerender({ value: 42 });
    act(() => jest.advanceTimersByTime(100));
    expect(result.current).toBe(42);
  });
});
