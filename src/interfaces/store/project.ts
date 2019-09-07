

/* tslint:disable:max-line-length */

import { Label, Project, Folder, Task } from '../app'
import { State as RootState } from '@/interfaces/store/index'
import { Action } from 'vuex';

export namespace ProjectState {
  export type projects = Project[]
  export type folders = Folder[]
  export type foldersOrder = string[]
}

export interface State {
  projects: ProjectState.projects
  folders: ProjectState.folders
  foldersOrder: ProjectState.foldersOrder
}

export namespace ProjectGetters {
  export type SortedFolders = Folder[]
  export type SortedFoldersByName = Folder[]
  export type SortedProjectsByName = Project[]
  export type GetPinedProjectsByFolderId = (id: string) => Project[]
  export type GetProjectsByFolderId = (id: string) => Project[]
  export type GetProjectByName = (name: string) => Project | undefined
  export type GetProjectById = (id: string) => Project | undefined
}

interface ActionContext {
  state: State
  getters: Getters
  commit: (mutation: string, payload?: any) => void
  dispatch: (action: string, payload?: any) => void
  rootState: RootState
}

export interface Getters {
  sortedFolders: (state: State) => ProjectGetters.SortedFolders
  sortedFoldersByName: (state: State) => ProjectGetters.SortedFolders
  sortedProjectsByName: (state: State) => ProjectGetters.SortedProjectsByName
  getProjectsByFolderId: (state: State) => ProjectGetters.GetProjectsByFolderId
  getProjectByName: (state: State) => ProjectGetters.GetProjectByName
  getProjectById: (state: State) => ProjectGetters.GetProjectById
  getPinedProjectsByFolderId: (state: State) => ProjectGetters.GetPinedProjectsByFolderId
  [key: string]: (state: State, getters: Getters) => void
}

export interface UtcObj {
  time: string
  date: string
}

export namespace ProjectActions {
  export type GetData = () => void
  export type StoreGetData = (context: ActionContext) => void

  export type StoreAddFoldersOrder = (context: ActionContext, id: string) => void
  export type AddFoldersOrder = (id: string) => Promise<any>

  export type StoreAddFolder = (context: ActionContext, name: string) => void
  export type AddFolder = (name: string) => void

  export type StoreDeleteFolderAndProjectsByFolderId = (context: ActionContext, id: string) => void
  export type DeleteFolderAndProjectsByFolderId = (id: string) => void

  export type StoreEditFolderNameById = (context: ActionContext, obj: {id: string, name: string}) => void
  export type EditFolderNameById = (obj: {id: string, name: string}) => void

  export type StoreSaveFoldersOrder = (context: ActionContext, ids: string[]) => void
  export type SaveFoldersOrder = (ids: string[]) => void

  export type StoreAddProject = (context: ActionContext, obj: {name: string, foldId: string, description: string}) => void
  export type AddProject = (obj: {name: string, foldId: string, description: string}) => void

  export type StoreMoveProjectsFromFolder = (context: ActionContext, obj: {from: string, to: string, ids: string[]}) => void
  export type MoveProjectsFromFolder = (obj: {from: string, to: string, ids: string[]}) => void

  export type StoreToggleProjectPin = (context: ActionContext, id: string) => void
  export type ToggleProjectPin = (id: string) => void

  export type StoreEditProject = (context: ActionContext, obj: {name: string, id: string, description: string}) => void
  export type EditProject = (obj: {name: string, id: string, description: string}) => void

  export type StoreDeleteProjectById = (context: ActionContext, id: string) => void
  export type DeleteProjectById = (id: string) => void

  export type StoreUpdateProjectTasks = (context: ActionContext, obj: {id: string, ids: string[]}) => void
  export type UpdateProjectTasks = (obj: {id: string, ids: string[]}) => void

  export type StoreAddProjectHeadings = (context: ActionContext, obj: {index: number, id: string, name: string, ids: string[]}) => void
  export type AddProjectHeadings = (obj: {index: number, name: string, id: string, ids: string[]}) => void

  export type StoreAddProjectHeadingFromHeading = (context: ActionContext, obj: {position: number, projectId: string, name: string, from: number, ids: string[]}) => void
  export type AddProjectHeadingFromHeading = (obj: {position: number, projectId: string, name: string, ids: string[], from: number}) => void

  export type StoreDeleteHeadingById = (context: ActionContext, obj: {projectId: string, headingId: string}) => void
  export type DeleteHeadingById = (obj: {projectId: string, headingId: string}) => void

  export type StoreUpdateHeadingsOrder = (context: ActionContext, obj: {ids: string[], projectId: string}) => void
  export type UpdateHeadingsOrder = (obj: {ids: string[], projectId: string}) => void

  export type StoreUpdateHeadingsTaskOrder = (context: ActionContext, obj: {projectId: string, ids: string[], headingId: string}) => void
  export type UpdateHeadingsTaskOrder = (obj: {projectId: string, ids: string[], headingId: string}) => void

  export type StoreAddProjectHeadingTask = (context: ActionContext, obj: {task: Task, projectId: string, position: number, headingId: string, order: string[], utc: UtcObj | null}) => void
  export type AddProjectHeadingTask = (obj: {task: Task, projectId: string, position: number, headingId: string, order: string[], utc: UtcObj | null}) => void

  export type StoreSaveProjectHeadingName = (context: ActionContext, obj: {name: string, projectId: string, headingId: string}) => void
  export type SaveProjectHeadingName = (obj: {name: string, projectId: string, headingId: string}) => void

  export type StoreMoveTasksFromRootToHeading = (context: ActionContext, obj: {to: string, ids: string[], projectId: string}) => void
  export type MoveTasksFromRootToHeading = (obj: {to: string, ids: string[], projectId: string}) => void

  export type StoreMoveTasksFromHeadingToRoot = (context: ActionContext, obj: {projectId: string, ids: string[], from: string}) => void
  export type MoveTasksFromHeadingToRoot = (obj: {projectId: string, ids: string[], from: string}) => void

  export type StoreMoveTasksFromHeadingToHeading = (context: ActionContext, obj: {ids: string[], projectId: string, from: string, to: string}) => void
  export type MoveTasksFromHeadingToHeading = (obj: {ids: string[], projectId: string, from: string, to: string}) => void
}
