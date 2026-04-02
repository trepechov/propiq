"use client";

/**
 * NewSchemeTabPanel — empty scheme editor shown when the "+" tab is active.
 *
 * Renders the same fields as SchemeTabPanel but with blank initial state.
 * Clicking "Create" calls onCreate with the entered data, which saves the
 * new scheme and switches the panel to the newly created scheme's tab.
 *
 * Field order:
 *   1. Payments (most important — also auto-derives the name)
 *   2. Price adjustment per m²
 *   3. Scheme name (needed here since there is no tab label yet)
 *   4. Notes
 *
 * Validation rules:
 *   - Scheme name is required.
 *   - If installments are present, the last one must have trigger 'act16'.
 */

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PaymentScheduleEditor from "./PaymentScheduleEditor";
import type { PaymentScheduleValue } from "./PaymentScheduleEditor";
import type { ProjectPaymentSchemeInsert } from "@/types/projectPaymentScheme";

interface Props {
  currency: string;
  onCreate: (
    data: Omit<ProjectPaymentSchemeInsert, "project_id" | "is_default">,
  ) => Promise<void>;
}

const INITIAL_SCHEDULE: PaymentScheduleValue = {
  name: "",
  installments: [{ percentage: 0, trigger: "signing" }],
};

export default function NewSchemeTabPanel({ currency, onCreate }: Props) {
  const [schedule, setSchedule] =
    useState<PaymentScheduleValue>(INITIAL_SCHEDULE);
  const [modifierRaw, setModifierRaw] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const modifier = parseFloat(modifierRaw);
    if (isNaN(modifier)) {
      setError("Price adjustment must be a valid number.");
      return;
    }

    // Last installment must be Act 16 when installments are present
    if (schedule.installments.length > 0) {
      const lastInstallment =
        schedule.installments[schedule.installments.length - 1];
      if (!lastInstallment || lastInstallment.trigger !== "act16") {
        setError("The last payment must be at Act 16 (completion).");
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      await onCreate({
        name: schedule.name.trim(),
        installments: schedule.installments,
        price_modifier_sqm: modifier,
        notes: notes.trim() || null,
      });
      // Reset form — parent will switch tab to the new scheme
      setSchedule(INITIAL_SCHEDULE);
      setModifierRaw("0");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  const modifierValue = parseFloat(modifierRaw);
  const modifierPrefix = !isNaN(modifierValue) && modifierValue >= 0 ? "+" : "";

  return (
    <Box role="tabpanel" sx={{ pt: 2 }}>
      <Stack spacing={3}>
        {/* Payments first — auto-derives the scheme name */}
        <PaymentScheduleEditor value={schedule} onChange={setSchedule} />

        {/* Price adjustment second */}
        <TextField
          label="Price adjustment per m²"
          type="number"
          value={modifierRaw}
          onChange={(e) => setModifierRaw(e.target.value)}
          helperText="Positive = premium (e.g. investor low-down scheme). Negative = discount."
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  {modifierPrefix}
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">{currency}/m²</InputAdornment>
              ),
            },
          }}
          fullWidth
        />

        {/* Notes */}
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

        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} /> : <AddIcon />}
            onClick={handleCreate}
            disabled={saving}
          >
            {saving ? "Creating…" : "Create Scheme"}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
