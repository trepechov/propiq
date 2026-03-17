/**
 * Dialog form for adding and editing projects.
 *
 * Workflow:
 *  1. User pastes raw proposal text.
 *  2. "Extract with AI" → Gemini extracts project + optional neighborhood fields.
 *  3. If a new neighborhood was extracted, a banner offers to save it first.
 *  4. User reviews extracted fields (editable) and picks a neighborhood.
 *  5. "Save" persists to Supabase via saveProject / updateProject.
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
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { extractProject } from '../services/extractProject'
import { saveProject, updateProject } from '../services/projects'
import { getNeighborhoods, saveNeighborhood } from '../services/neighborhoods'
import type { Project, ProjectInsert, Neighborhood, NeighborhoodInsert } from '../types'
import ProjectFields from './ProjectFields'
import type { FieldValues } from './ProjectFields'
import { BuildingStage } from '../config/domain'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  existing?: Project
}

const SAMPLE_TEXT = [
  'Project: Synera Residence',
  'Developer: Bulgarian Properties',
  'Neighborhood: Манастирски ливади - изток, Sofia',
  'Stage: Act 14 (construction started)',
  'Completion: December 2026',
  'Total floors: 10  |  Total apartments: 95',
  'Price: 1 850 EUR/sqm (incl. VAT)  |  Price date: March 2026',
  'Gross yield: 5.2%',
  'Currency: EUR',
  'Commission: 2%  |  Source: Bulgarian Properties website',
  'Payment: 20% on signing, 30% on Act 14, 50% on Act 16',
  'Notes: South-facing units available. Parking included above 5th floor.',
].join('\n')

const EMPTY_FIELDS: FieldValues = {
  neighborhood_id: '',
  title: '',
  developer: null,
  source: null,
  commission: null,
  total_apartments: null,
  total_floors: null,
  current_stage: BuildingStage.PLANNING,
  completion_date: null,
  building_notes: null,
  currency: null,
  price_sqm: null,
  price_date: null,
  payment_schedule: null,
  notes: null,
  ai_summary: null,
}

function serializeExisting(p: Project): string {
  const lines = [
    `Title: ${p.title}`,
    p.developer       ? `Developer: ${p.developer}`             : null,
    p.source          ? `Source: ${p.source}`                   : null,
    p.commission      ? `Commission: ${p.commission}`           : null,
    p.current_stage   ? `Stage: ${p.current_stage}`             : null,
    p.completion_date ? `Completion date: ${p.completion_date}` : null,
    p.price_sqm !== null ? `Price/sqm: ${p.price_sqm} ${p.currency ?? 'EUR'}` : null,
    p.total_apartments !== null ? `Total apartments: ${p.total_apartments}` : null,
    p.total_floors !== null ? `Total floors: ${p.total_floors}` : null,
    p.building_notes  ? `Building notes: ${p.building_notes}`   : null,
    p.notes           ? `Notes: ${p.notes}`                     : null,
  ]
  return lines.filter(Boolean).join('\n')
}

export default function ProjectForm({ open, onClose, onSaved, existing }: Props) {
  const theme    = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [rawText, setRawText]                 = useState('')
  const [fields, setFields]                   = useState<FieldValues>(EMPTY_FIELDS)
  const [extracted, setExtracted]             = useState(false)
  const [extracting, setExtracting]           = useState(false)
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
    setPendingNeighborhood(null)
    if (existing) {
      setRawText(serializeExisting(existing))
      setFields({ ...existing })
      setExtracted(true)
    } else {
      setRawText(SAMPLE_TEXT)
      setFields(EMPTY_FIELDS)
    }
  }, [open, existing])

  async function handleExtract() {
    const trimmed = rawText.trim()
    if (!trimmed) return

    setExtracting(true)
    setError(null)
    setPendingNeighborhood(null)
    try {
      const result = await extractProject(trimmed)
      setFields((prev) => ({ ...result.project, neighborhood_id: prev.neighborhood_id } as FieldValues))
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
