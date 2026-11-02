'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { ManagementGroup, GroupRole, PRESET_GROUP_COLORS } from '@/types/group'
import { groupService } from '@/services/groupService'
import { useAuth } from '@/context/AuthContext'

interface GroupContextType {
  currentGroup: ManagementGroup | null
  groups: ManagementGroup[]
  loading: boolean
  error: string | null
  isEntrySelectionActive: boolean
  setIsEntrySelectionActive: (active: boolean) => void
  selectGroup: (groupId: string) => void
  switchGroup: (groupId: string) => void
  createGroup: (data: { name: string; description?: string | null; color: string }) => Promise<ManagementGroup>
  updateGroup: (groupId: string, data: Partial<ManagementGroup>) => Promise<ManagementGroup>
  archiveGroup: (groupId: string) => Promise<void>
  deleteGroup: (groupId: string, force?: boolean) => Promise<void>
  refreshGroups: () => Promise<void>
  // Modals state
  isGroupModalOpen: boolean
  setIsGroupModalOpen: (open: boolean) => void
  groupToEdit: ManagementGroup | null
  setGroupToEdit: (group: ManagementGroup | null) => void
  // UI helpers
  userRoleInCurrentGroup: GroupRole
  canEditGroup: boolean
}

const GroupContext = createContext<GroupContextType | undefined>(undefined)

const ACTIVE_GROUP_KEY = 'financeira_active_group_id'

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [groups, setGroups] = useState<ManagementGroup[]>([])
  const [currentGroup, setCurrentGroup] = useState<ManagementGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEntrySelectionActive, setIsEntrySelectionActive] = useState(false)

  // Modals
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const [groupToEdit, setGroupToEdit] = useState<ManagementGroup | null>(null)

  const activeUserId = user?.id || 'local-user-id'

  const refreshGroups = useCallback(async () => {
    if (!user && activeUserId !== 'local-user-id') {
      setGroups([])
      setCurrentGroup(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const list = await groupService.getGroups(activeUserId)
      setGroups(list)

      // Determine active group
      const savedGroupId = typeof window !== 'undefined' 
        ? localStorage.getItem(`${ACTIVE_GROUP_KEY}_${activeUserId}`) 
        : null

      let active: ManagementGroup | null = null

      if (savedGroupId) {
        active = list.find(g => g.id === savedGroupId && g.status === 'active') || null
      }

      // If no valid saved group, pick first active group
      if (!active) {
        active = list.find(g => g.status === 'active') || list[0] || null
      }

      setCurrentGroup(active)

      // Check entry screen requirement:
      // If user has more than 1 active group, and has not yet made an explicit session selection
      if (typeof window !== 'undefined') {
        const sessionSelected = sessionStorage.getItem(`financeira_session_group_selected_${activeUserId}`)
        const activeGroups = list.filter(g => g.status === 'active')
        if (activeGroups.length > 1 && !sessionSelected) {
          setIsEntrySelectionActive(true)
        } else {
          setIsEntrySelectionActive(false)
        }
      }

      setError(null)
    } catch (err: any) {
      console.error('[GroupContext] Failed to load groups:', err)
      setError(err?.message || 'Falha ao carregar grupos de gerenciamento.')
    } finally {
      setLoading(false)
    }
  }, [user, activeUserId])

  useEffect(() => {
    if (!authLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshGroups()
    }
  }, [refreshGroups, authLoading])

  const selectGroup = useCallback((groupId: string) => {
    const target = groups.find(g => g.id === groupId)
    if (!target) return

    setCurrentGroup(target)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${ACTIVE_GROUP_KEY}_${activeUserId}`, groupId)
      sessionStorage.setItem(`financeira_session_group_selected_${activeUserId}`, 'true')
    }
    setIsEntrySelectionActive(false)
  }, [groups, activeUserId])

  const createGroup = useCallback(async (data: { name: string; description?: string | null; color: string }) => {
    try {
      const newGroup = await groupService.createGroup(activeUserId, data)
      setGroups(prev => [...prev, newGroup])
      selectGroup(newGroup.id)
      setIsGroupModalOpen(false)
      setGroupToEdit(null)
      return newGroup
    } catch (err: any) {
      throw err
    }
  }, [activeUserId, selectGroup])

  const updateGroup = useCallback(async (groupId: string, data: Partial<ManagementGroup>) => {
    try {
      const updated = await groupService.updateGroup(groupId, data)
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...updated } : g))
      if (currentGroup?.id === groupId) {
        setCurrentGroup(prev => prev ? { ...prev, ...updated } : prev)
      }
      setIsGroupModalOpen(false)
      setGroupToEdit(null)
      return updated
    } catch (err: any) {
      throw err
    }
  }, [currentGroup])

  const archiveGroup = useCallback(async (groupId: string) => {
    try {
      const archived = await groupService.archiveGroup(groupId)
      setGroups(prev => prev.map(g => g.id === groupId ? archived : g))
      // If archived was current, select next active group
      if (currentGroup?.id === groupId) {
        const remaining = groups.filter(g => g.id !== groupId && g.status === 'active')
        if (remaining.length > 0) {
          selectGroup(remaining[0].id)
        }
      }
    } catch (err: any) {
      throw err
    }
  }, [groups, currentGroup, selectGroup])

  const deleteGroup = useCallback(async (groupId: string, force: boolean = false) => {
    try {
      await groupService.deleteGroup(groupId, force)
      setGroups(prev => prev.filter(g => g.id !== groupId))
      if (currentGroup?.id === groupId) {
        const remaining = groups.filter(g => g.id !== groupId && g.status === 'active')
        if (remaining.length > 0) {
          selectGroup(remaining[0].id)
        }
      }
    } catch (err: any) {
      throw err
    }
  }, [groups, currentGroup, selectGroup])

  const userRoleInCurrentGroup: GroupRole = useMemo(() => {
    if (!currentGroup) return 'viewer'
    if (currentGroup.owner_id === activeUserId) return 'owner'
    return currentGroup.current_user_role || 'editor'
  }, [currentGroup, activeUserId])

  const canEditGroup = useMemo(() => {
    return userRoleInCurrentGroup === 'owner' || userRoleInCurrentGroup === 'admin'
  }, [userRoleInCurrentGroup])

  const value = useMemo(() => ({
    currentGroup,
    groups,
    loading,
    error,
    isEntrySelectionActive,
    setIsEntrySelectionActive,
    selectGroup,
    switchGroup: selectGroup,
    createGroup,
    updateGroup,
    archiveGroup,
    deleteGroup,
    refreshGroups,
    isGroupModalOpen,
    setIsGroupModalOpen,
    groupToEdit,
    setGroupToEdit,
    userRoleInCurrentGroup,
    canEditGroup
  }), [
    currentGroup,
    groups,
    loading,
    error,
    isEntrySelectionActive,
    selectGroup,
    createGroup,
    updateGroup,
    archiveGroup,
    deleteGroup,
    refreshGroups,
    isGroupModalOpen,
    groupToEdit,
    userRoleInCurrentGroup,
    canEditGroup
  ])

  return (
    <GroupContext.Provider value={value}>
      {children}
    </GroupContext.Provider>
  )
}

export function useGroup() {
  const context = useContext(GroupContext)
  if (!context) {
    throw new Error('useGroup must be used within a GroupProvider')
  }
  return context
}
