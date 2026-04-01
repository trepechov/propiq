'use client'

/**
 * /criteria — AI Criteria Editor
 *
 * Lets users view and override the AI prompt criteria used for extraction
 * and search. Each criterion is shown in a separate tab with a large textarea.
 * Saving upserts the user's row; Reset deletes it to restore the default.
 */

import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { CRITERIA_KEYS, type CriteriaKey, type UserCriteriaMap } from '@/types/userCriteria'

const TAB_LABELS: Record<CriteriaKey, string> = {
  evaluation_criteria: 'Evaluation Criteria',
  query_context: 'Query Context',
  extraction_rules: 'Extraction Rules',
  neighborhood_research: 'Neighborhood Research',
}

type TabState = {
  content: string
  isDefault: boolean
  saving: boolean
  saved: boolean
  error: string | null
}

type TabsState = Record<CriteriaKey, TabState>

function buildTabsState(criteriaMap: UserCriteriaMap): TabsState {
  return Object.fromEntries(
    CRITERIA_KEYS.map((key) => [
      key,
      {
        content: criteriaMap[key].content,
        isDefault: criteriaMap[key].isDefault,
        saving: false,
        saved: false,
        error: null,
      },
    ]),
  ) as TabsState
}

export default function CriteriaPage() {
  const [tabs, setTabs] = useState<TabsState | null>(null)
  const [activeTab, setActiveTab] = useState<CriteriaKey>('evaluation_criteria')
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    loadCriteria()
  }, [])

  async function loadCriteria() {
    setLoadError(null)
    try {
      const res = await fetch('/api/criteria')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Failed to load criteria (${res.status})`)
      }
      const { criteria } = await res.json() as { criteria: UserCriteriaMap }
      setTabs(buildTabsState(criteria))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load criteria')
    }
  }

  function setTabField(key: CriteriaKey, fields: Partial<TabState>) {
    setTabs((prev) => prev ? { ...prev, [key]: { ...prev[key], ...fields } } : prev)
  }

  async function handleSave(key: CriteriaKey) {
    if (!tabs) return
    const content = tabs[key].content

    setTabField(key, { saving: true, error: null })
    try {
      const res = await fetch('/api/criteria', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, content }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Save failed (${res.status})`)
      }
      setTabField(key, { saving: false, saved: true, isDefault: false })
      setTimeout(() => setTabField(key, { saved: false }), 2000)
    } catch (err) {
      setTabField(key, {
        saving: false,
        error: err instanceof Error ? err.message : 'Save failed',
      })
    }
  }

  async function handleReset(key: CriteriaKey) {
    setTabField(key, { saving: true, error: null })
    try {
      const res = await fetch(`/api/criteria?key=${key}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Reset failed (${res.status})`)
      }
      // Reload all criteria to get the default content back
      await loadCriteria()
    } catch (err) {
      setTabField(key, {
        saving: false,
        error: err instanceof Error ? err.message : 'Reset failed',
      })
    }
  }

  if (loadError) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="error">{loadError}</Alert>
      </Container>
    )
  }

  if (!tabs) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box display="flex" justifyContent="center" mt={6}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  const activeState = tabs[activeTab]

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">AI Criteria</Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary" mb={2}>
        Customise the prompts used by the AI for extraction and search.
        Changes apply to your account only. Reset restores the system default.
      </Typography>

      <Tabs
        value={activeTab}
        onChange={(_, value: CriteriaKey) => setActiveTab(value)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {CRITERIA_KEYS.map((key) => (
          <Tab
            key={key}
            label={TAB_LABELS[key]}
            value={key}
          />
        ))}
      </Tabs>

      <Box sx={{ maxHeight: 'calc(100vh - 280px)', overflow: 'auto' }}>
        <TextField
          multiline
          minRows={20}
          fullWidth
          value={activeState.content}
          onChange={(e) => setTabField(activeTab, { content: e.target.value })}
          variant="outlined"
          inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
        />
      </Box>

      <Stack direction="row" spacing={2} alignItems="center" mt={2}>
        <Button
          variant="contained"
          onClick={() => handleSave(activeTab)}
          disabled={activeState.saving}
        >
          {activeState.saving ? 'Saving…' : 'Save'}
        </Button>
        <Button
          variant="outlined"
          onClick={() => handleReset(activeTab)}
          disabled={activeState.saving || activeState.isDefault}
        >
          Reset to Default
        </Button>
        {activeState.saved && (
          <Alert severity="success" sx={{ py: 0 }}>Saved</Alert>
        )}
        {activeState.error && (
          <Alert severity="error" sx={{ py: 0 }}>{activeState.error}</Alert>
        )}
        {activeState.isDefault && (
          <Typography variant="body2" color="text.secondary">
            Using default
          </Typography>
        )}
      </Stack>
    </Container>
  )
}
