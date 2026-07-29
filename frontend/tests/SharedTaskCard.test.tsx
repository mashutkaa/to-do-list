import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SharedTaskCard from '../src/components/SharedTaskCard.jsx';

const sharedTask = {
  id: 'shared-1',
  title: 'Перевірити API',
  description: 'Ендпоінт shared-with-me',
  status: 'IN_PROGRESS',
  priority: 'MEDIUM',
  deadline: '2099-06-15',
  user: {
    id: 'owner-1',
    name: 'Олена',
    email: 'olena@example.com',
  },
  shares: [{ id: 'share-1', createdAt: '2099-01-10T12:00:00.000Z' }],
};

describe('SharedTaskCard', () => {
  it('renders shared task with owner info in read-only view', () => {
    render(<SharedTaskCard task={sharedTask} />);

    expect(
      screen.getByRole('heading', { name: 'Перевірити API' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ендпоінт shared-with-me')).toBeInTheDocument();
    expect(screen.getByText('Від: Олена')).toBeInTheDocument();
    expect(screen.getByText('olena@example.com')).toBeInTheDocument();
    expect(screen.getByText('В процесі')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Видалити/i }),
    ).not.toBeInTheDocument();
  });

  it('falls back to owner email when name is missing', () => {
    render(
      <SharedTaskCard
        task={{
          ...sharedTask,
          user: { id: 'owner-2', email: 'friend@example.com' },
        }}
      />,
    );

    expect(screen.getByText('Від: friend@example.com')).toBeInTheDocument();
  });
});
