import { create } from 'zustand';
import type { TaskItem, TaskStatus } from '../types';

export type TaskFilter = TaskStatus | 'all';

interface TaskState {
  tasks: TaskItem[];
  filter: TaskFilter;
  setTasks: (tasks: TaskItem[]) => void;
  setFilter: (filter: TaskFilter) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  filter: 'all',
  setTasks: tasks => set(() => ({ tasks })),
  setFilter: filter => set(() => ({ filter })),
  updateTaskStatus: (id, status) =>
    set(() => ({
      tasks: get().tasks.map(task => (task.id === id ? { ...task, status } : task))
    }))
}));
