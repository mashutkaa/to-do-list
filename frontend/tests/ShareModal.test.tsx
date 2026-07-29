import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock('../src/services/api.js', () => ({
  default: {
    post: postMock,
  },
}));

import ShareTaskModal from '../src/components/ShareTaskModal.jsx';

const tasks = [
  { id: 'task-1', title: 'Купити молоко' },
  { id: 'task-2', title: 'Написати звіт' },
];

describe('ShareTaskModal (ShareModal)', () => {
  const onClose = vi.fn();
  const onShared = vi.fn();

  beforeEach(() => {
    onClose.mockReset();
    onShared.mockReset();
    postMock.mockReset();
    postMock.mockResolvedValue({
      data: { shares: [{ id: 'share-1' }], count: 1 },
    });
  });

  it('does not render when closed', () => {
    const { container } = render(
      <ShareTaskModal
        isOpen={false}
        onClose={onClose}
        tasks={tasks}
        onShared={onShared}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders task list and email field when open', () => {
    render(
      <ShareTaskModal
        isOpen
        onClose={onClose}
        tasks={tasks}
        onShared={onShared}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Поділитися задачами' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Купити молоко')).toBeInTheDocument();
    expect(screen.getByText('Написати звіт')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('friend@example.com')).toBeInTheDocument();
    expect(screen.getByText('Обрано задач: 0')).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup();

    render(
      <ShareTaskModal
        isOpen
        onClose={onClose}
        tasks={tasks}
        onShared={onShared}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Поділитися/i }));

    expect(
      screen.getByText('Оберіть хоча б одну задачу для надсилання'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Введіть коректну email-адресу'),
    ).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('selects all tasks and shares them by email', async () => {
    const user = userEvent.setup();

    render(
      <ShareTaskModal
        isOpen
        onClose={onClose}
        tasks={tasks}
        onShared={onShared}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Обрати всі' }));
    expect(screen.getByText('Обрано задач: 2')).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText('friend@example.com'),
      'friend@example.com',
    );
    await user.click(screen.getByRole('button', { name: /Поділитися/i }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/tasks/share', {
        taskIds: ['task-1', 'task-2'],
        email: 'friend@example.com',
      });
    });

    await waitFor(() => {
      expect(onShared).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shares a single selected task', async () => {
    const user = userEvent.setup();

    render(
      <ShareTaskModal
        isOpen
        onClose={onClose}
        tasks={tasks}
        onShared={onShared}
      />,
    );

    await user.click(screen.getByLabelText('Написати звіт'));
    await user.type(
      screen.getByPlaceholderText('friend@example.com'),
      'colleague@example.com',
    );
    await user.click(screen.getByRole('button', { name: /Поділитися/i }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/tasks/share', {
        taskIds: ['task-2'],
        email: 'colleague@example.com',
      });
    });
  });

  it('shows API error message on failed share', async () => {
    const user = userEvent.setup();
    postMock.mockRejectedValue({
      response: { data: { message: 'Забагато запитів на шеринг' } },
    });

    render(
      <ShareTaskModal
        isOpen
        onClose={onClose}
        tasks={tasks}
        onShared={onShared}
      />,
    );

    await user.click(screen.getByLabelText('Купити молоко'));
    await user.type(
      screen.getByPlaceholderText('friend@example.com'),
      'friend@example.com',
    );
    await user.click(screen.getByRole('button', { name: /Поділитися/i }));

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Забагато запитів на шеринг');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes modal via cancel button', async () => {
    const user = userEvent.setup();

    render(
      <ShareTaskModal
        isOpen
        onClose={onClose}
        tasks={tasks}
        onShared={onShared}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Скасувати' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('disables submit when there are no tasks', () => {
    render(
      <ShareTaskModal
        isOpen
        onClose={onClose}
        tasks={[]}
        onShared={onShared}
      />,
    );

    expect(screen.getByText('Немає задач для надсилання')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Поділитися/i })).toBeDisabled();
  });
});
