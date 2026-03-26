'use client'

/**
 * Per-result feedback widget for the Opportunity Search screen.
 *
 * Renders thumbs-up / thumbs-down buttons with an optional collapsible note
 * field. Submits to saveFeedback on confirm; locks buttons after submission.
 */

import { useState } from 'react'
import {
  Box,
  Button,
  Collapse,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ThumbUpOutlinedIcon   from '@mui/icons-material/ThumbUpOutlined'
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined'
import ThumbUpIcon           from '@mui/icons-material/ThumbUp'
import ThumbDownIcon         from '@mui/icons-material/ThumbDown'
import { saveFeedback } from '@/lib/supabase/searchFeedback'
import { MatchType, FeedbackRating } from '@/types'
import type { MatchType as MatchTypeT } from '@/types'

// ── Props ─────────────────────────────────────────────────────────────────────

interface FeedbackWidgetProps {
  projectId: string
  unitId?:   string
  matchType: MatchTypeT
  queryText: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FeedbackWidget({
  projectId,
  unitId,
  matchType,
  queryText,
}: FeedbackWidgetProps) {
  const [selected, setSelected]   = useState<'up' | 'down' | null>(null)
  const [note, setNote]           = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const noteVisible = selected !== null && !submitted

  async function handleSubmit() {
    if (!selected) return

    setSaving(true)
    setError(null)
    try {
      await saveFeedback({
        query_text:        queryText,
        result_project_id: projectId,
        result_unit_id:    unitId ?? null,
        match_type:        matchType === MatchType.MATCHING
                             ? MatchType.MATCHING
                             : MatchType.NON_MATCHING,
        rating:            selected === 'up' ? FeedbackRating.UP : FeedbackRating.DOWN,
        note:              note.trim() || null,
      })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save feedback')
    } finally {
      setSaving(false)
    }
  }

  if (submitted) {
    return (
      <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
        Feedback saved
      </Typography>
    )
  }

  return (
    <Box sx={{ mt: 1 }}>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography variant="caption" color="text.secondary">
          Was this useful?
        </Typography>

        <Tooltip title="Good match">
          <span>
            <IconButton
              size="small"
              onClick={() => setSelected(selected === 'up' ? null : 'up')}
              color={selected === 'up' ? 'success' : 'default'}
              disabled={saving}
              aria-label="Thumbs up"
            >
              {selected === 'up'
                ? <ThumbUpIcon fontSize="small" />
                : <ThumbUpOutlinedIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Poor match">
          <span>
            <IconButton
              size="small"
              onClick={() => setSelected(selected === 'down' ? null : 'down')}
              color={selected === 'down' ? 'warning' : 'default'}
              disabled={saving}
              aria-label="Thumbs down"
            >
              {selected === 'down'
                ? <ThumbDownIcon fontSize="small" />
                : <ThumbDownOutlinedIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Collapse in={noteVisible}>
        <Stack spacing={1} mt={1}>
          <TextField
            size="small"
            placeholder="Add a note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            rows={2}
            fullWidth
          />
          <Button
            size="small"
            variant="contained"
            onClick={handleSubmit}
            disabled={saving}
            sx={{ alignSelf: 'flex-start' }}
          >
            {saving ? 'Saving…' : 'Submit'}
          </Button>
        </Stack>
      </Collapse>

      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
          {error}
        </Typography>
      )}
    </Box>
  )
}
