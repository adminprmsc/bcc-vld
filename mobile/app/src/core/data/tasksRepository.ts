import type { TaskItem } from '../types';
import { getDatabase } from './database';

export async function loadCachedTasks(): Promise<TaskItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DbTaskRow>('SELECT id, title, role, due, status FROM tasks ORDER BY updatedAt DESC');
  return rows.map(row => ({
    id: row.id,
    title: row.title ?? '',
    role: row.role ?? '',
    due: row.due ?? '',
    status: row.status ?? 'pending'
  }));
}

export async function persistTasks(tasks: TaskItem[]): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async tx => {
    await tx.execAsync('DELETE FROM tasks');
    for (const task of tasks) {
      await tx.runAsync(
        `INSERT OR REPLACE INTO tasks (id, title, role, due, status, updatedAt)
         VALUES (?, ?, ?, ?, ?, strftime('%s','now'))`,
        [task.id, task.title, task.role, task.due, task.status]
      );
    }
  });
}

interface DbTaskRow {
  id: string;
  title?: string;
  role?: string;
  due?: string;
  status?: TaskItem['status'];
}
