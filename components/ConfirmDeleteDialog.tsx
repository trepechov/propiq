/**
 * Reusable confirmation dialog for destructive delete actions.
 *
 * Prevents accidental deletes by requiring explicit user confirmation.
 * Shows a loading spinner on the Delete button while the async operation runs.
 * Blocks dismissal (backdrop click and Escape key) while deletion is in progress.
 *
 * TODO: Future improvement — consider soft delete (archive flag) for neighborhoods
 * and projects so data can be recovered. Hard delete is fine for v1.
 */

import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'

interface Props {
  open: boolean
  title: string
  description: string
  onConfirm: () => Promise<void> | void
  onCancel: () => void
  loading?: boolean
}

export default function ConfirmDeleteDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  loading = false,
}: Props) {
  function handleClose(_event: object, reason: string) {
    // Block backdrop clicks and Escape key while deletion is running
    if (loading && (reason === 'backdropClick' || reason === 'escapeKeyDown')) return
    onCancel()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      disableEscapeKeyDown={loading}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{description}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  )
}
