/**
 * Supabase CRUD helpers for the `projects` table.
 *
 * All functions throw on error — callers are responsible for handling failures.
 * No silent failures: every Supabase error surfaces immediately.
 */

import { supabase } from './supabase'
import type { Project, ProjectInsert } from '../types'

/** Returns all projects ordered by title. */
export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('title')

  if (error) throw new Error(`getProjects failed: ${error.message}`)
  return data
}

/** Returns a single project by id. Throws if not found. */
export async function getProject(id: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`getProject failed: ${error.message}`)
  return data
}

/**
 * Returns all projects belonging to a neighborhood, ordered by title.
 * Used to list projects when viewing a neighborhood detail page.
 */
export async function getProjectsByNeighborhood(
  neighborhoodId: string,
): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('neighborhood_id', neighborhoodId)
    .order('title')

  if (error) throw new Error(`getProjectsByNeighborhood failed: ${error.message}`)
  return data
}

/** Inserts a new project and returns the created row. */
export async function saveProject(projectData: ProjectInsert): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert(projectData)
    .select()
    .single()

  if (error) throw new Error(`saveProject failed: ${error.message}`)
  return data
}

/** Updates an existing project by id and returns the updated row. */
export async function updateProject(
  id: string,
  projectData: Partial<ProjectInsert>,
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(projectData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`updateProject failed: ${error.message}`)
  return data
}

/** Deletes a project by id. Throws if the delete fails. */
export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`deleteProject failed: ${error.message}`)
}
