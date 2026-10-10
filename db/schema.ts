import {sqliteTable,text,integer,primaryKey} from 'drizzle-orm/sqlite-core';
export const saves=sqliteTable('kitchen_saves',{userId:text('user_id').primaryKey(),state:text('state').notNull(),revision:integer('revision').notNull().default(1),updatedAt:text('updated_at').notNull()});
export const creations=sqliteTable('kitchen_creations',{userId:text('user_id').notNull(),id:text('id').notNull(),name:text('name').notNull(),dish:text('dish').notNull(),score:integer('score').notNull(),createdAt:text('created_at').notNull()},t=>[primaryKey({columns:[t.userId,t.id]})]);
