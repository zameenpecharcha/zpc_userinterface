import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={() => !busy && onCancel()} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 14, color: '#5C675F', pt: 0.5 }}>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy} sx={{ textTransform: 'none' }}>
          {cancelLabel}
        </Button>
        <Button variant="contained" onClick={onConfirm} disabled={busy} sx={{ textTransform: 'none' }}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
