/**
 * Dialog form for adding and editing neighborhoods.
 *
 * Workflow:
 *  1. User pastes raw text about the area.
 *  2. "Research with AI" → Gemini extracts structured fields.
 *  3. User reviews and edits extracted fields.
 *  4. "Save" persists to Supabase via saveNeighborhood / updateNeighborhood.
 *
 * When `existing` is provided the form pre-fills with the existing record's
 * data serialised as text so the AI can re-process it.
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
import { extractNeighborhood } from '../services/extractNeighborhood'
import { saveNeighborhood, updateNeighborhood } from '../services/neighborhoods'
import type { Neighborhood, NeighborhoodInsert } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  existing?: Neighborhood
}

const EMPTY_FIELDS: NeighborhoodInsert = {
  name: '',
  city: '',
  target_buyers: [],
  transport_links: null,
  nearby_amenities: null,
  neighbourhood_notes: null,
}

function serializeExisting(n: Neighborhood): string {
  return [
    `Name: ${n.name}`,
    `City: ${n.city}`,
    `Target buyers: ${n.target_buyers.join(', ')}`,
    n.transport_links   ? `Transport links: ${n.transport_links}`     : null,
    n.nearby_amenities  ? `Nearby amenities: ${n.nearby_amenities}`   : null,
    n.neighbourhood_notes ? `Notes: ${n.neighbourhood_notes}`         : null,
  ]
    .filter(Boolean)
    .join('\n')
}

export default function NeighborhoodForm({ open, onClose, onSaved, existing }: Props) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('xs'))

  const [rawText, setRawText]     = useState('')
  const [fields, setFields]       = useState<NeighborhoodInsert>(EMPTY_FIELDS)
  const [extracted, setExtracted] = useState(false)
  const [researching, setResearching] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setExtracted(false)
      setError(null)
      if (existing) {
        setRawText(serializeExisting(existing))
        setFields({
          name:                existing.name,
          city:                existing.city,
          target_buyers:       existing.target_buyers,
          transport_links:     existing.transport_links,
          nearby_amenities:    existing.nearby_amenities,
          neighbourhood_notes: existing.neighbourhood_notes,
        })
        setExtracted(true)
      } else {
        setRawText('')
        setFields(EMPTY_FIELDS)
      }
    }
  }, [open, existing])

  async function handleResearch() {
    const trimmed = rawText.trim()
    if (!trimmed) return

    setResearching(true)
    setError(null)
    try {
      const extracted = await extractNeighborhood(trimmed)
      setFields(extracted)
      setExtracted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI extraction failed')
    } finally {
      setResearching(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      if (existing) {
        await updateNeighborhood(existing.id, fields)
      } else {
        await saveNeighborhood(fields)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function updateField(key: keyof NeighborhoodInsert, value: string | string[] | null) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  const canSave = extracted && fields.name.trim() !== '' && fields.city.trim() !== ''

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>{existing ? 'Edit Neighborhood' : 'Add Neighborhood'}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Paste neighborhood info"
            multiline
            rows={5}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste any raw text about the area — description, links, notes…"
            fullWidth
          />

          <Button
            variant="outlined"
            onClick={handleResearch}
            disabled={researching || !rawText.trim()}
            startIcon={researching ? <CircularProgress size={16} /> : undefined}
          >
            {researching ? 'Researching…' : 'Research with AI'}
          </Button>

          {error && <Alert severity="error">{error}</Alert>}

          {extracted && (
            <>
              <TextField
                label="Name"
                value={fields.name}
                onChange={(e) => updateField('name', e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="City"
                value={fields.city}
                onChange={(e) => updateField('city', e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Target buyers (comma-separated)"
                value={fields.target_buyers.join(', ')}
                onChange={(e) =>
                  updateField(
                    'target_buyers',
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                fullWidth
                helperText="e.g. investors, young_professionals"
              />
              <TextField
                label="Transport links"
                value={fields.transport_links ?? ''}
                onChange={(e) => updateField('transport_links', e.target.value || null)}
                fullWidth
                multiline
                rows={2}
              />
              <TextField
                label="Nearby amenities"
                value={fields.nearby_amenities ?? ''}
                onChange={(e) => updateField('nearby_amenities', e.target.value || null)}
                fullWidth
                multiline
                rows={2}
              />
              <TextField
                label="Notes"
                value={fields.neighbourhood_notes ?? ''}
                onChange={(e) => updateField('neighbourhood_notes', e.target.value || null)}
                fullWidth
                multiline
                rows={3}
              />
            </>
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
          disabled={!canSave || saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
