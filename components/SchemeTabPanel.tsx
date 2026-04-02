'use client'

/**
 * SchemeTabPanel — inline editor shown inside a single payment scheme tab.
 *
 * Renders the editable fields for one scheme:
 *   - Installments via PaymentScheduleEditor (first — most important)
 *   - Price modifier (locked to 0 and disabled for the default scheme)
 *   - Notes (optional multiline)
 *   - Save / Make Default / Delete buttons
 *
 * The default scheme's modifier is always 0 and cannot be changed.
 * The default scheme cannot be deleted or demoted.
 * The scheme name is derived automatically from installments (shown as tab label).
 *
 * Validation rules:
 *   - If installments are present, the last one must have trigger 'act16'.
 *   - Only a scheme with zero modifier can be promoted to default.
 */

import { useState, useEffect } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'
import StarIcon from '@mui/icons-material/Star'
import PaymentScheduleEditor from './PaymentScheduleEditor'
import type { PaymentScheduleValue } from './PaymentScheduleEditor'
import type { ProjectPaymentScheme, ProjectPaymentSchemeInsert } from '@/types/projectPaymentScheme'

interface Props {
  scheme: ProjectPaymentScheme
  currency: string
  onSave: (id: string, data: Partial<ProjectPaymentSchemeInsert>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onSetDefault: (id: string) => Promise<void>
}

function buildScheduleValue(scheme: ProjectPaymentScheme): PaymentScheduleValue {
  return { name: scheme.name, installments: scheme.installments }
}

export default function SchemeTabPanel({ scheme, currency, onSave, onDelete, onSetDefault }: Props) {
  const [schedule, setSchedule]       = useState<PaymentScheduleValue>(buildScheduleValue(scheme))
  const [modifierRaw, setModifierRaw] = useState(String(scheme.price_modifier_sqm))
  const [notes, setNotes]             = useState(scheme.notes ?? '')
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [settingDefault, setSettingDefault] = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Re-sync local state when the scheme prop changes (e.g. after a reload)
  useEffect(() => {
    setSchedule(buildScheduleValue(scheme))
    setModifierRaw(String(scheme.price_modifier_sqm))
    setNotes(scheme.notes ?? '')
    setError(null)
  }, [scheme.id])

  async function handleSave() {
    const modifier = parseFloat(modifierRaw)
    if (isNaN(modifier)) {
      setError('Price adjustment must be a valid number.')
      return
    }

    // Last installment must be Act 16 when installments are present
    if (schedule.installments.length > 0) {
      const lastInstallment = schedule.installments[schedule.installments.length - 1]
      if (!lastInstallment || lastInstallment.trigger !== 'act16') {
        setError('The last payment must be at Act 16 (completion).')
        return
      }
    }

    setSaving(true)
    setError(null)
    try {
      await onSave(scheme.id, {
        name: schedule.name.trim(),
        installments: schedule.installments,
        price_modifier_sqm: scheme.is_default ? 0 : modifier,
        notes: notes.trim() || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSetDefault() {
    setSettingDefault(true)
    setError(null)
    try {
      await onSetDefault(scheme.id)
      setModifierRaw('0')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default.')
    } finally {
      setSettingDefault(false)
    }
  }

  async function handleDeleteConfirm() {
    setDeleting(true)
    setError(null)
    try {
      await onDelete(scheme.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <Box role="tabpanel" sx={{ pt: 2 }}>
      <Stack spacing={3}>
        {/* Payments first — primary content */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Payments
          </Typography>
          <PaymentScheduleEditor value={schedule} onChange={setSchedule} />
        </Box>

        {/* Price adjustment second */}
        <Tooltip
          title={scheme.is_default ? 'The default scheme always uses the base unit prices (modifier locked to 0).' : ''}
          placement="top-start"
        >
          <TextField
            label="Price adjustment per m²"
            type="number"
            value={scheme.is_default ? '0' : modifierRaw}
            onChange={(e) => setModifierRaw(e.target.value)}
            disabled={scheme.is_default}
            helperText={
              scheme.is_default
                ? 'Always the base price — cannot be changed for the default scheme.'
                : 'Positive = premium (e.g. investor low-down scheme). Negative = discount.'
            }
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    {scheme.is_default ? '' : (parseFloat(modifierRaw) >= 0 ? '+' : '')}
                  </InputAdornment>
                ),
                endAdornment: <InputAdornment position="end">{currency}/m²</InputAdornment>,
              },
            }}
            fullWidth
          />
        </Tooltip>

        {/* Notes third */}
        <TextField
          label="Notes"
          multiline
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional: describe when to use this scheme"
          fullWidth
        />

        {error && <Alert severity="error">{error}</Alert>}

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          {!scheme.is_default && !confirmDelete && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
            >
              Delete
            </Button>
          )}

          {confirmDelete && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="error">
                Delete this scheme?
              </Typography>
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                startIcon={deleting ? <CircularProgress size={14} /> : undefined}
              >
                Confirm
              </Button>
              <Button size="small" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Cancel
              </Button>
            </Stack>
          )}

          {!scheme.is_default && (
            <Button
              variant="outlined"
              startIcon={settingDefault ? <CircularProgress size={16} /> : <StarIcon />}
              onClick={handleSetDefault}
              disabled={settingDefault}
            >
              {settingDefault ? 'Updating…' : 'Make Default'}
            </Button>
          )}

          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
