export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  userId: string;
  createdAt: string;
}

export interface TaskShare {
  id: string;
  taskId: string;
  targetEmail: string;
  userId?: string | null;
}
