import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedNavLayout } from '../src/App';
import type { DailySettlementResponse } from '../src/lib/api';

const useAuthMock = vi.fn();
const settleDailyIfNeededMock = vi.fn();

vi.mock('../src/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => useAuthMock(),
}));

vi.mock('../src/lib/api', () => ({
  settleDailyIfNeeded: (...args: unknown[]) => settleDailyIfNeededMock(...args),
}));

const settlementResponse: DailySettlementResponse = {
  success: true,
  settled: false,
  checked_in: false,
  current_app_day: '2026-03-12',
  previous_app_day: '2026-03-11',
  hp_penalty: 0,
  freeze_consumed: false,
  streak_reset: false,
  rotated_daily_pool: false,
  streak: 1,
  xp_multiplier: 1,
};

function renderProtectedLayout() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<ProtectedNavLayout />}>
          <Route path="/dashboard" element={<div>home</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedNavLayout', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    settleDailyIfNeededMock.mockReset();
  });

  it('does not restart settlement when auth rerenders with a new refreshProfile callback for the same user', async () => {
    let refreshProfile = vi.fn().mockResolvedValue(undefined);

    useAuthMock.mockImplementation(() => ({
      user: { id: 'user-1' },
      loading: false,
      refreshProfile,
    }));

    let resolveSettlement!: (value: DailySettlementResponse) => void;
    settleDailyIfNeededMock.mockReturnValueOnce(
      new Promise<DailySettlementResponse>((resolve) => {
        resolveSettlement = resolve;
      }),
    );

    const view = renderProtectedLayout();

    expect(view.container.querySelector('.animate-spin')).not.toBeNull();

    resolveSettlement(settlementResponse);

    await screen.findByText('home');
    expect(settleDailyIfNeededMock).toHaveBeenCalledTimes(1);

    refreshProfile = vi.fn().mockResolvedValue(undefined);
    view.rerender(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedNavLayout />}>
            <Route path="/dashboard" element={<div>home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('home')).toBeTruthy();
      expect(view.container.querySelector('.animate-spin')).toBeNull();
      expect(settleDailyIfNeededMock).toHaveBeenCalledTimes(1);
    });
  });
});
