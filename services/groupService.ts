import { getSupabase, isLocalFallbackActive, setHasGroupIdColumn } from '@/lib/supabase'
import { ManagementGroup, GroupMember, PRESET_GROUP_COLORS } from '@/types/group'

const LOCAL_GROUPS_KEY = 'financeira_management_groups'
const LOCAL_GROUP_MEMBERS_KEY = 'financeira_group_members'

function getLocalGroups(userId: string): ManagementGroup[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(`${LOCAL_GROUPS_KEY}_${userId}`) || localStorage.getItem(LOCAL_GROUPS_KEY)
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

function saveLocalGroups(userId: string, groups: ManagementGroup[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${LOCAL_GROUPS_KEY}_${userId}`, JSON.stringify(groups))
  // Keep base key in sync for offline safety
  localStorage.setItem(LOCAL_GROUPS_KEY, JSON.stringify(groups))
}

function getLocalMembers(groupId: string): GroupMember[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(`${LOCAL_GROUP_MEMBERS_KEY}_${groupId}`)
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

function saveLocalMembers(groupId: string, members: GroupMember[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${LOCAL_GROUP_MEMBERS_KEY}_${groupId}`, JSON.stringify(members))
}

/**
 * Migration helper for local storage data:
 * Ensures all existing local records (movements, expenses, debts, etc.)
 * get tagged with the initial default group ID so nothing is lost.
 */
function migrateLocalOrphanRecords(userId: string, targetGroupId: string): void {
  if (typeof window === 'undefined') return

  // 1. Movements
  try {
    const rawMoves = localStorage.getItem('financeira_movements')
    if (rawMoves) {
      const moves = JSON.parse(rawMoves)
      let changed = false
      const updated = moves.map((m: any) => {
        if (!m.group_id) {
          changed = true
          return { ...m, group_id: targetGroupId }
        }
        return m
      })
      if (changed) {
        localStorage.setItem('financeira_movements', JSON.stringify(updated))
      }
    }
  } catch (e) {
    console.warn('[GroupService] Local migration warn movements:', e)
  }

  // 2. Structural Expenses
  try {
    const rawStruct = localStorage.getItem('financeira_structural_expenses')
    if (rawStruct) {
      const structs = JSON.parse(rawStruct)
      let changed = false
      const updated = structs.map((s: any) => {
        if (!s.group_id) {
          changed = true
          return { ...s, group_id: targetGroupId }
        }
        return s
      })
      if (changed) {
        localStorage.setItem('financeira_structural_expenses', JSON.stringify(updated))
      }
    }
  } catch (e) {
    console.warn('[GroupService] Local migration warn structural:', e)
  }

  // 3. Debt Persons
  try {
    const rawPersons = localStorage.getItem('financeira_debt_persons')
    if (rawPersons) {
      const persons = JSON.parse(rawPersons)
      let changed = false
      const updated = persons.map((p: any) => {
        if (!p.group_id) {
          changed = true
          return { ...p, group_id: targetGroupId }
        }
        return p
      })
      if (changed) {
        localStorage.setItem('financeira_debt_persons', JSON.stringify(updated))
      }
    }
  } catch (e) {
    console.warn('[GroupService] Local migration warn debt persons:', e)
  }

  // 4. Debts
  try {
    const rawDebts = localStorage.getItem('financeira_debts')
    if (rawDebts) {
      const debts = JSON.parse(rawDebts)
      let changed = false
      const updated = debts.map((d: any) => {
        if (!d.group_id) {
          changed = true
          return { ...d, group_id: targetGroupId }
        }
        return d
      })
      if (changed) {
        localStorage.setItem('financeira_debts', JSON.stringify(updated))
      }
    }
  } catch (e) {
    console.warn('[GroupService] Local migration warn debts:', e)
  }

  // 5. Debt Payments
  try {
    const rawPayments = localStorage.getItem('financeira_debt_payments')
    if (rawPayments) {
      const payments = JSON.parse(rawPayments)
      let changed = false
      const updated = payments.map((p: any) => {
        if (!p.group_id) {
          changed = true
          return { ...p, group_id: targetGroupId }
        }
        return p
      })
      if (changed) {
        localStorage.setItem('financeira_debt_payments', JSON.stringify(updated))
      }
    }
  } catch (e) {
    console.warn('[GroupService] Local migration warn payments:', e)
  }

  // 6. Clients & Receipts
  try {
    const rawClients = localStorage.getItem(`financeira_clients_${userId}`) || localStorage.getItem('financeira_clients')
    if (rawClients) {
      const clients = JSON.parse(rawClients)
      let changed = false
      const updated = clients.map((c: any) => {
        if (!c.group_id) {
          changed = true
          return { ...c, group_id: targetGroupId }
        }
        return c
      })
      if (changed) {
        localStorage.setItem(`financeira_clients_${userId}`, JSON.stringify(updated))
      }
    }
  } catch (e) {
    console.warn('[GroupService] Local migration warn clients:', e)
  }

  try {
    const rawReceipts = localStorage.getItem(`financeira_receipts_${userId}`) || localStorage.getItem('financeira_receipts')
    if (rawReceipts) {
      const receipts = JSON.parse(rawReceipts)
      let changed = false
      const updated = receipts.map((r: any) => {
        if (!r.group_id) {
          changed = true
          return { ...r, group_id: targetGroupId }
        }
        return r
      })
      if (changed) {
        localStorage.setItem(`financeira_receipts_${userId}`, JSON.stringify(updated))
      }
    }
  } catch (e) {
    console.warn('[GroupService] Local migration warn receipts:', e)
  }
}

export const groupService = {
  /**
   * Fetches all groups accessible to the specified user.
   * Auto-provisions a default "Pessoal" group if none exists,
   * guaranteeing zero interruption.
   */
  async getGroups(userId: string): Promise<ManagementGroup[]> {
    if (!userId) return []

    if (isLocalFallbackActive() || userId === 'local-user-id') {
      let groups = getLocalGroups(userId)
      if (groups.length === 0) {
        const defaultGroup: ManagementGroup = {
          id: 'group-pessoal-default',
          name: 'Pessoal',
          description: 'Ambiente financeiro pessoal e contas gerais',
          color: PRESET_GROUP_COLORS[0].hex, // '#6366f1'
          owner_id: userId,
          status: 'active',
          settings: { currency: 'BRL', defaultMonthlyBudget: 1200 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          current_user_role: 'owner'
        }
        groups = [defaultGroup]
        saveLocalGroups(userId, groups)
        migrateLocalOrphanRecords(userId, defaultGroup.id)
      } else {
        // Ensure role is assigned
        groups = groups.map(g => ({
          ...g,
          current_user_role: g.owner_id === userId ? 'owner' : (g.current_user_role || 'editor')
        }))
      }
      return groups
    }

    try {
      const supabase = getSupabase()

      // Fetch groups where user is owner OR member
      const { data: ownedGroups, error: ownedErr } = await supabase
        .from('management_groups')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: true })

      if (ownedErr) {
        console.warn('[GroupService] Supabase fetch owned groups warning:', ownedErr.message)
        setHasGroupIdColumn(false)
        const local = getLocalGroups(userId)
        if (local.length > 0) return local
        return [{
          id: 'group-pessoal-default',
          name: 'Pessoal',
          description: 'Ambiente financeiro pessoal e contas gerais',
          color: PRESET_GROUP_COLORS[0].hex,
          owner_id: userId,
          status: 'active',
          settings: { currency: 'BRL', defaultMonthlyBudget: 1200 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          current_user_role: 'owner'
        }]
      }

      // Fetch group memberships
      const { data: memberRows, error: memberErr } = await supabase
        .from('group_members')
        .select('group_id, role, management_groups(*)')
        .eq('user_id', userId)

      const memberGroups: ManagementGroup[] = []
      if (!memberErr && memberRows) {
        for (const row of memberRows) {
          if (row.management_groups) {
            const mg = row.management_groups as unknown as ManagementGroup
            if (!ownedGroups?.some(g => g.id === mg.id)) {
              memberGroups.push({
                ...mg,
                current_user_role: row.role as any
              })
            }
          }
        }
      }

      let combined: ManagementGroup[] = [
        ...(ownedGroups || []).map(g => ({ ...g, current_user_role: 'owner' as const })),
        ...memberGroups
      ]

      // If user has zero groups in Supabase, create the initial default "Pessoal" group
      if (combined.length === 0) {
        try {
          const { data: newGroup, error: createErr } = await supabase
            .from('management_groups')
            .insert({
              name: 'Pessoal',
              description: 'Ambiente financeiro pessoal e contas gerais',
              color: PRESET_GROUP_COLORS[0].hex,
              owner_id: userId,
              status: 'active',
              settings: { currency: 'BRL', defaultMonthlyBudget: 1200 }
            })
            .select()
            .single()

          if (!createErr && newGroup) {
            // Also insert group_members entry
            await supabase.from('group_members').insert({
              group_id: newGroup.id,
              user_id: userId,
              role: 'admin'
            })

            // Backfill orphan records for this user
            await supabase
              .from('financial_movements')
              .update({ group_id: newGroup.id })
              .eq('user_id', userId)
              .is('group_id', null)

            await supabase
              .from('structural_expenses')
              .update({ group_id: newGroup.id })
              .eq('user_id', userId)
              .is('group_id', null)

            await supabase
              .from('debt_persons')
              .update({ group_id: newGroup.id })
              .eq('user_id', userId)
              .is('group_id', null)

            await supabase
              .from('debts')
              .update({ group_id: newGroup.id })
              .eq('user_id', userId)
              .is('group_id', null)

            combined = [{ ...newGroup, current_user_role: 'owner' }]
          }
        } catch (initErr) {
          console.warn('[GroupService] Failed to auto-provision initial group in Supabase:', initErr)
        }
      }

      // Sync local cache
      saveLocalGroups(userId, combined)
      return combined
    } catch (err) {
      console.error('[GroupService] getGroups exception:', err)
      return getLocalGroups(userId)
    }
  },

  /**
   * Creates a new Management Group
   */
  async createGroup(userId: string, payload: {
    name: string
    description?: string | null
    color: string
    settings?: any
  }): Promise<ManagementGroup> {
    const trimmedName = payload.name.trim()
    if (!trimmedName) throw new Error('O nome do grupo não pode estar vazio.')

    const color = payload.color || PRESET_GROUP_COLORS[0].hex

    if (isLocalFallbackActive() || userId === 'local-user-id') {
      const groups = getLocalGroups(userId)
      const mockId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'grp_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now()

      const newGroup: ManagementGroup = {
        id: mockId,
        name: trimmedName,
        description: payload.description?.trim() || null,
        color,
        owner_id: userId,
        status: 'active',
        settings: payload.settings || { currency: 'BRL' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_user_role: 'owner'
      }

      groups.push(newGroup)
      saveLocalGroups(userId, groups)
      return newGroup
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('management_groups')
      .insert({
        name: trimmedName,
        description: payload.description?.trim() || null,
        color,
        owner_id: userId,
        status: 'active',
        settings: payload.settings || { currency: 'BRL' }
      })
      .select()
      .single()

    if (error || !data) {
      if (error?.message?.includes('management_groups') || error?.code === '42P01') {
        console.warn('[GroupService] management_groups table missing on Supabase. Saved group locally.')
        setHasGroupIdColumn(false)
        const groups = getLocalGroups(userId)
        const mockId = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'grp_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now()

        const localGroup: ManagementGroup = {
          id: mockId,
          name: trimmedName,
          description: payload.description?.trim() || null,
          color,
          owner_id: userId,
          status: 'active',
          settings: payload.settings || { currency: 'BRL' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          current_user_role: 'owner'
        }

        groups.push(localGroup)
        saveLocalGroups(userId, groups)
        return localGroup
      }
      throw new Error(`Falha ao criar o grupo de gerenciamento: ${error?.message || 'Erro desconhecido'}`)
    }

    // Add owner to group_members
    await supabase.from('group_members').insert({
      group_id: data.id,
      user_id: userId,
      role: 'admin'
    })

    const createdGroup: ManagementGroup = {
      ...data,
      current_user_role: 'owner'
    }

    // Update local cache
    const current = getLocalGroups(userId)
    saveLocalGroups(userId, [...current, createdGroup])

    return createdGroup
  },

  /**
   * Updates an existing Management Group
   */
  async updateGroup(groupId: string, updates: Partial<ManagementGroup>): Promise<ManagementGroup> {
    if (isLocalFallbackActive()) {
      const all = getLocalGroups('local-user-id')
      const index = all.findIndex(g => g.id === groupId)
      if (index === -1) throw new Error('Grupo não encontrado.')

      const updated = {
        ...all[index],
        ...updates,
        updated_at: new Date().toISOString()
      }
      all[index] = updated
      saveLocalGroups('local-user-id', all)
      return updated
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('management_groups')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', groupId)
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Erro ao atualizar o grupo de gerenciamento: ${error?.message || 'Erro desconhecido'}`)
    }

    return data as ManagementGroup
  },

  /**
   * Archives a group (safest approach when financial records exist)
   */
  async archiveGroup(groupId: string): Promise<ManagementGroup> {
    return this.updateGroup(groupId, { status: 'archived' })
  },

  /**
   * Safely deletes a group if empty or if force is confirmed
   */
  async deleteGroup(groupId: string, force: boolean = false): Promise<void> {
    if (isLocalFallbackActive()) {
      const all = getLocalGroups('local-user-id')
      if (all.length <= 1) {
        throw new Error('Você deve manter pelo menos um grupo financeiro ativo.')
      }

      // Check movements
      const rawMoves = localStorage.getItem('financeira_movements')
      if (rawMoves) {
        const moves = JSON.parse(rawMoves)
        const inGroup = moves.filter((m: any) => m.group_id === groupId)
        if (inGroup.length > 0 && !force) {
          throw new Error(`Este grupo contém ${inGroup.length} movimentações financeiras. Arquive o grupo ou confirme a exclusão de todas as movimentações.`)
        }
        if (force) {
          const remaining = moves.filter((m: any) => m.group_id !== groupId)
          localStorage.setItem('financeira_movements', JSON.stringify(remaining))
        }
      }

      const filtered = all.filter(g => g.id !== groupId)
      saveLocalGroups('local-user-id', filtered)
      return
    }

    const supabase = getSupabase()

    // Count records first
    const { count, error: countErr } = await supabase
      .from('financial_movements')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)

    if (!countErr && (count || 0) > 0 && !force) {
      throw new Error(`Este grupo possui ${count} movimentações vinculadas. Arquive o grupo para preservar os dados ou confirme a exclusão irreversível.`)
    }

    const { error } = await supabase
      .from('management_groups')
      .delete()
      .eq('id', groupId)

    if (error) {
      throw new Error(`Erro ao excluir grupo: ${error.message}`)
    }
  },

  /**
   * Group Members Management
   */
  async getMembers(groupId: string): Promise<GroupMember[]> {
    if (isLocalFallbackActive()) {
      return getLocalMembers(groupId)
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('group_members')
      .select('*, profiles(email, full_name)')
      .eq('group_id', groupId)

    if (error) {
      console.warn('[GroupService] Error fetching group members:', error.message)
      return []
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      group_id: row.group_id,
      user_id: row.user_id,
      role: row.role,
      email: row.profiles?.email,
      full_name: row.profiles?.full_name,
      created_at: row.created_at
    }))
  }
}
