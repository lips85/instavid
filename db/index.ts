import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { projects } from './schema';
import { eq } from 'drizzle-orm';

// PostgreSQL 연결 설정
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  ssl: false,
});

// Drizzle ORM 인스턴스 생성
export const db = drizzle(pool);

// 프로젝트 관련 데이터베이스 작업
export async function getProjects() {
  const result = await db.select().from(projects);
  return result;
}

export async function getProject(id: string) {
  const [result] = await db.select().from(projects).where(eq(projects.id, id));
  return result;
}

export async function createProject(data: typeof projects.$inferInsert) {
  const [result] = await db.insert(projects).values(data).returning();
  return result;
}

export async function updateProject(id: string, updates: Partial<typeof projects.$inferInsert>) {
  console.log('Updating project with ID:', id);
  console.log('Update data:', updates);

  try {
    const updatedProject = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();

    console.log('Updated project result:', updatedProject);

    if (!updatedProject || updatedProject.length === 0) {
      throw new Error('Project not found');
    }

    return updatedProject[0];
  } catch (error) {
    console.error('Error in updateProject:', error);
    throw error;
  }
}

export async function deleteProject(id: string) {
  await db.delete(projects).where(eq(projects.id, id));
} 