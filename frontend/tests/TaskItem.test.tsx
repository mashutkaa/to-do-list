import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../src/components/EditTaskModal.jsx', () => ({
  default: () => null,
}));

import TaskCard from '../src/components/TaskCard.jsx';

const baseTask = {
  id: 'task-1',
  title: 'Підготувати презентацію',
  description: 'Слайди для співбесіди',
  status: 'PENDING',
  priority: 'HIGH',
  deadline: '2099-12-31',
};

describe('TaskCard (TaskItem)', () => {
  const onStatusChange = vi.fn();
  const onDelete = vi.fn();

  beforeEach(() => {
    onStatusChange.mockReset();
    onDelete.mockReset();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders title, description, priority and status', () => {
    render(
      <TaskCard
        task={baseTask}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Підготувати презентацію' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Слайди для співбесіди')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Статус задачі: До виконання/i }),
    ).toBeInTheDocument();
  });

  it('toggles completion via checkbox button', async () => {
    const user = userEvent.setup();

    render(
      <TaskCard
        task={baseTask}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Позначити як виконану' }),
    );

    expect(onStatusChange).toHaveBeenCalledWith('task-1', 'COMPLETED');
  });

  it('marks completed task back to pending', async () => {
    const user = userEvent.setup();

    render(
      <TaskCard
        task={{ ...baseTask, status: 'COMPLETED' }}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Позначити як невиконану' }),
    );

    expect(onStatusChange).toHaveBeenCalledWith('task-1', 'PENDING');
  });

  it('changes status from dropdown', async () => {
    const user = userEvent.setup();

    render(
      <TaskCard
        task={baseTask}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /Статус задачі: До виконання/i }),
    );

    const listbox = screen.getByRole('listbox', {
      name: 'Оберіть статус задачі',
    });
    await user.click(within(listbox).getByRole('option', { name: 'В процесі' }));

    expect(onStatusChange).toHaveBeenCalledWith('task-1', 'IN_PROGRESS');
  });

  it('does not call onStatusChange when selecting the same status', async () => {
    const user = userEvent.setup();

    render(
      <TaskCard
        task={baseTask}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /Статус задачі: До виконання/i }),
    );

    const listbox = screen.getByRole('listbox', {
      name: 'Оберіть статус задачі',
    });
    await user.click(
      within(listbox).getByRole('option', { name: 'До виконання' }),
    );

    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it('deletes task after confirmation', async () => {
    const user = userEvent.setup();

    render(
      <TaskCard
        task={baseTask}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Видалити задачу Підготувати презентацію',
      }),
    );

    expect(window.confirm).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith('task-1');
  });

  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <TaskCard
        task={baseTask}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Видалити задачу Підготувати презентацію',
      }),
    );

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('shows overdue label for past deadline on incomplete task', () => {
    render(
      <TaskCard
        task={{ ...baseTask, deadline: '2020-01-01' }}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText('(Прострочено)')).toBeInTheDocument();
  });
});
