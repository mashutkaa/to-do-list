import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Toast from '../src/components/Toast.jsx';

describe('Toast', () => {
  it('renders nothing without a message', () => {
    const { container } = render(<Toast message="" onClose={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a success message by default', () => {
    render(<Toast message="Успішно надіслано!" onClose={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('Успішно надіслано!');
  });

  it('renders a warning message when the email was not sent', () => {
    render(
      <Toast
        message="Лист не надіслано"
        variant="warning"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Лист не надіслано');
  });

  it('auto-closes after the given duration', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(<Toast message="Готово" onClose={onClose} duration={1000} />);
    vi.advanceTimersByTime(1000);

    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
