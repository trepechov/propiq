/**
 * Dialog form for adding and editing projects.
 *
 * Workflow:
 *  1. User pastes raw proposal text.
 *  2. "Extract with AI" → Gemini extracts project + optional neighborhood fields.
 *  3. After completion, a one-line stats caption shows duration and tokens.
 *  4. If a new neighborhood was extracted, a banner offers to save it first.
 *  5. User reviews extracted fields (editable) and picks a neighborhood.
 *  6. "Save" persists to Supabase via saveProject / updateProject.
 *
 * When `existing` is provided, fields pre-fill and extraction is bypassed.
 */

import { useState, useEffect } from 'react'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { extractProject } from '../services/extractProject'
import { saveProject, updateProject } from '../services/projects'
import { getNeighborhoods, saveNeighborhood } from '../services/neighborhoods'
import type { ExtractionMeta } from '../services/extractProject'
import type { Project, ProjectInsert, Neighborhood, NeighborhoodInsert } from '../types'
import ProjectFields from './ProjectFields'
import type { FieldValues } from './ProjectFields'
import {
  PROJECT_FORM_SAMPLE_TEXT,
  PROJECT_FORM_EMPTY_FIELDS,
  serializeExistingProject,
} from './ProjectForm.helpers'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  existing?: Project
}

export default function ProjectForm({ open, onClose, onSaved, existing }: Props) {
  const theme    = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [rawText, setRawText]                 = useState('')
  const [fields, setFields]                   = useState<FieldValues>(PROJECT_FORM_EMPTY_FIELDS)
  const [extracted, setExtracted]             = useState(false)
  const [extracting, setExtracting]           = useState(false)
  const [meta, setMeta]                       = useState<ExtractionMeta | null>(null)
  const [saving, setSaving]                   = useState(false)
  const [error, setError]                     = useState<string | null>(null)
  const [neighborhoods, setNeighborhoods]     = useState<Neighborhood[]>([])
  const [pendingNeighborhood, setPendingNeighborhood] = useState<NeighborhoodInsert | null>(null)
  const [savingNeighborhood, setSavingNeighborhood]   = useState(false)

  useEffect(() => {
    getNeighborhoods().then(setNeighborhoods).catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    setExtracted(false)
    setError(null)
    setMeta(null)
    setPendingNeighborhood(null)
    if (existing) {
      setRawText(serializeExistingProject(existing))
      setFields({ ...existing })
      setExtracted(true)
    } else {
      setRawText(PROJECT_FORM_SAMPLE_TEXT)
      setFields(PROJECT_FORM_EMPTY_FIELDS)
    }
  }, [open, existing])

  async function handleExtract() {
    const trimmed = rawText.trim()
    if (!trimmed) return

    setExtracting(true)
    setMeta(null)
    setError(null)
    setPendingNeighborhood(null)
    try {
      const result = await extractProject(trimmed)
      setFields((prev) => ({ ...result.project, neighborhood_id: prev.neighborhood_id } as FieldValues))
      setMeta(result.meta)
      setExtracted(true)

      if (result.neighborhood) {
        const alreadyExists = neighborhoods.some(
          (n) => n.name.toLowerCase() === result.neighborhood!.name.toLowerCase(),
        )
        if (!alreadyExists) {
          setPendingNeighborhood(result.neighborhood)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI extraction failed')
    } finally {
      setExtracting(false)
    }
  }

  async function handleSaveNeighborhood() {
    if (!pendingNeighborhood) return
    setSavingNeighborhood(true)
    try {
      const saved = await saveNeighborhood(pendingNeighborhood)
      setNeighborhoods((prev) => [...prev, saved])
      setFields((prev) => ({ ...prev, neighborhood_id: saved.id }))
      setPendingNeighborhood(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save neighborhood')
    } finally {
      setSavingNeighborhood(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload: ProjectInsert = { ...fields }
      if (existing) {
        await updateProject(existing.id, payload)
      } else {
        await saveProject(payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function setField<K extends keyof FieldValues>(key: K, value: FieldValues[K]) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  function numOrNull(raw: string): number | null {
    const n = parseFloat(raw)
    return isNaN(n) ? null : n
  }

  const canExtract = !extracting && rawText.trim().length > 0
  const canSave    = extracted && fields.title.trim() !== '' && !saving

  return (
    <Dialog open={open} onClose={onClose} fullScreen={isMobile} fullWidth maxWidth="md">
      <DialogTitle>{existing ? 'Edit Project' : 'Add Project'}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Paste project proposal text"
            multiline
            rows={6}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            fullWidth
          />

          <Button
            variant="outlined"
            onClick={handleExtract}
            disabled={!canExtract}
            startIcon={extracting ? <CircularProgress size={16} /> : undefined}
          >
            {extracting ? 'Extracting…' : 'Extract with AI'}
          </Button>

          {!extracting && meta !== null && (
            <Alert severity="info" sx={{ py: 0 }}>
              <Typography variant="caption">
                ✓ {(meta.durationMs / 1000).toFixed(1)}s · {meta.tokens.toLocaleString()} tokens
              </Typography>
            </Alert>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {pendingNeighborhood && (
            <Alert
              severity="info"
              action={
                <Button
                  size="small"
                  onClick={handleSaveNeighborhood}
                  disabled={savingNeighborhood}
                  startIcon={savingNeighborhood ? <CircularProgress size={14} /> : undefined}
                >
                  {savingNeighborhood ? 'Saving…' : 'Save Neighborhood'}
                </Button>
              }
            >
              Neighborhood &ldquo;{pendingNeighborhood.name}&rdquo; was found in the proposal. Save it first?
            </Alert>
          )}

          {extracted && (
            <ProjectFields
              fields={fields}
              neighborhoods={neighborhoods}
              setField={setField}
              numOrNull={numOrNull}
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!canSave}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
