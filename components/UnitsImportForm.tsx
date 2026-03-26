'use client'

/**
 * Dialog for importing units from raw text via AI extraction.
 *
 * Workflow:
 *  1. User pastes CSV or tabular unit data.
 *  2. "Parse with AI" → calls POST /api/extract/units (stub in Phase 4,
 *     real LangChain.js in Phase 3).
 *  3. A preview table shows the extracted units before saving.
 *  4. A stats caption shows duration and token count.
 *  5. "Import All" bulk-inserts the units into Supabase via saveUnits.
 *
 * AI stub error handling: if the extraction endpoint returns non-2xx (e.g. 501
 * during Phase 4), the error is shown in the form — no crash.
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
import { saveUnits } from '@/lib/supabase/units'
import type { UnitInsert } from '@/types'
import UnitsPreviewTable from './UnitsPreviewTable'

interface ExtractionMeta {
  durationMs: number
  tokens: number
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  projectId: string
}

export default function UnitsImportForm({ open, onClose, onSaved, projectId }: Props) {
  const theme    = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [rawText, setRawText] = useState('')
  const [units, setUnits]     = useState<UnitInsert[]>([])
  const [parsed, setParsed]   = useState(false)
  const [parsing, setParsing] = useState(false)
  const [meta, setMeta]       = useState<ExtractionMeta | null>(null)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [notice, setNotice]   = useState<string | null>(null)

  // Reset state when the dialog opens
  useEffect(() => {
    if (!open) return
    setRawText('')
    setUnits([])
    setParsed(false)
    setMeta(null)
    setError(null)
    setNotice(null)
  }, [open])

  async function handleParse() {
    const trimmed = rawText.trim()
    if (!trimmed) return

    setParsing(true)
    setMeta(null)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch('/api/extract/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: trimmed, projectId }),
      })

      if (!response.ok) {
        // 501 from stub or other error — show user-friendly message, don't crash
        const body = await response.json().catch(() => ({}))
        const msg = body?.error ?? 'AI extraction is not yet available'
        if (response.status === 501) {
          setNotice(msg)
        } else {
          setError(msg)
        }
        return
      }

      const result = await response.json()
      setUnits(result.units)
      setMeta(result.meta)
      setParsed(true)

      if (result.units.length === 0) {
        setError('No valid units could be extracted from the text. Check the format and try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI extraction failed')
    } finally {
      setParsing(false)
    }
  }

  async function handleImportAll() {
    if (units.length === 0) return
    setSaving(true)
    setError(null)
    try {
      await saveUnits(units)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save units')
    } finally {
      setSaving(false)
    }
  }

  const canParse  = !parsing && rawText.trim().length > 0
  const canImport = parsed && units.length > 0 && !saving

  return (
    <Dialog open={open} onClose={onClose} fullScreen={isMobile} fullWidth maxWidth="md">
      <DialogTitle>Import Units</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Paste unit data (CSV, table, or free text)"
            multiline
            rows={8}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            fullWidth
            placeholder={[
              'Type, Number, Floor, Net Area, Total Area, Price/m², Total Price, Direction, Status',
              'Apartment, A101, 1, 65.5, 72.0, 1800, 129600, south, available',
              'Apartment, A102, 1, 55.0, 60.5, 1800, 108900, north, sold',
              'Parking, P01, -1, , 14.0, 600, 8400, , available',
            ].join('\n')}
          />

          <Button
            variant="outlined"
            onClick={handleParse}
            disabled={!canParse}
            startIcon={parsing ? <CircularProgress size={16} /> : undefined}
          >
            {parsing ? 'Parsing…' : 'Parse with AI'}
          </Button>

          {!parsing && meta !== null && (
            <Alert severity="info" sx={{ py: 0 }}>
              <Typography variant="caption">
                ✓ {(meta.durationMs / 1000).toFixed(1)}s · {meta.tokens.toLocaleString()} tokens
                {units.length > 0 && ` · ${units.length} unit${units.length !== 1 ? 's' : ''} found`}
              </Typography>
            </Alert>
          )}

          {notice && <Alert severity="info">{notice}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}

          {parsed && units.length > 0 && (
            <UnitsPreviewTable units={units} />
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleImportAll}
          disabled={!canImport}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {saving ? 'Saving…' : `Import All (${units.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
