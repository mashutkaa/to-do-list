import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock('../src/services/api.js', () => ({
  default: {
    post: postMock,
  },
}));

import ForgotPasswordPage from '../src/pages/ForgotPasswordPage.jsx';

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({
      data: {
        message:
          'Якщо акаунт із цим email існує, ми надіслали інструкції для відновлення пароля.',
      },
    });
  });

  it('submits the email and shows a success message', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'friend@example.com',
    );
    await user.click(
      screen.getByRole('button', { name: /Надіслати посилання/i }),
    );

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'friend@example.com',
      });
    });

    expect(
      await screen.findByText(/надіслали інструкції/i),
    ).toBeInTheDocument();
  });

  it('validates an empty email', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole('button', { name: /Надіслати посилання/i }),
    );

    expect(screen.getByText('Введіть email')).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });
});
