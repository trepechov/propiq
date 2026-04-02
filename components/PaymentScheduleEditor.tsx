"use client";

/**
 * PaymentScheduleEditor — inline editor for a payment scheme's name + installments.
 *
 * Features:
 *   - Name field (manual entry, auto-derives from installments via installmentsToSchemeName)
 *   - Manual rows: each shows percentage (number) + trigger (select from PaymentTrigger values)
 *   - "Add installment" and per-row delete buttons
 *   - Percentage sum badge — amber warning if ≠ 100%
 *
 * Note: price_modifier_sqm is NOT shown here. This editor handles only the
 * scheme name + installments. The preset picker was removed — users type freely.
 */

import { useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { BuildingStage } from "@/config/domain";
import type { PaymentInstallmentData } from "@/types/projectPaymentScheme";
import { installmentsToSchemeName } from "@/lib/payment/parseScheme";

// All valid trigger values: 'signing' + all BuildingStage values
const TRIGGER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "signing", label: "Signing (contract date)" },
  { value: BuildingStage.ACT_14, label: "Act 14 — Raw structure" },
  { value: BuildingStage.ACT_15, label: "Act 15 — Building ready" },
  { value: BuildingStage.ACT_16, label: "Act 16 — Completion" },
];

export interface PaymentScheduleValue {
  name: string;
  installments: PaymentInstallmentData[];
}

interface Props {
  value: PaymentScheduleValue;
  onChange: (value: PaymentScheduleValue) => void;
}

export default function PaymentScheduleEditor({ value, onChange }: Props) {
  // Auto-derive name whenever installments change
  useEffect(() => {
    if (value.installments.length === 0) return;
    const derivedName = installmentsToSchemeName(value.installments);
    if (derivedName !== value.name) {
      onChange({ ...value, name: derivedName });
    }
    // Intentionally only react to installment changes, not name changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.installments]);

  function handleInstallmentChange(
    index: number,
    field: keyof PaymentInstallmentData,
    raw: string,
  ) {
    const updated = value.installments.map((item, i) => {
      if (i !== index) return item;
      if (field === "percentage") {
        return { ...item, percentage: parseFloat(raw) || 0 };
      }
      return { ...item, trigger: raw };
    });
    onChange({ ...value, installments: updated });
  }

  function handleAddPayment() {
    const usedTriggers = new Set(value.installments.map((i) => i.trigger))
    const nextTrigger =
      TRIGGER_OPTIONS.find((opt) => !usedTriggers.has(opt.value))?.value ?? 'signing'
    onChange({
      ...value,
      installments: [
        ...value.installments,
        { percentage: 0, trigger: nextTrigger },
      ],
    })
  }

  function handleRemoveInstallment(index: number) {
    onChange({
      ...value,
      installments: value.installments.filter((_, i) => i !== index),
    });
  }

  const percentageSum = value.installments.reduce(
    (sum, i) => sum + (i.percentage || 0),
    0,
  );
  const sumOk = Math.abs(percentageSum - 100) < 0.01;

  return (
    <Stack spacing={2}>
      {value.installments.length > 0 && (
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1, display: "block" }}
          >
            Payments
          </Typography>
          <Stack spacing={1}>
            {value.installments.map((item, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <TextField
                  label="%"
                  type="number"
                  value={item.percentage}
                  onChange={(e) =>
                    handleInstallmentChange(i, "percentage", e.target.value)
                  }
                  slotProps={{
                    input: { inputProps: { min: 0, max: 100, step: 1 } },
                  }}
                  sx={{ width: 90 }}
                  size="small"
                />
                <FormControl sx={{ flex: 1 }} size="small">
                  <InputLabel id={`trigger-${i}-label`}>Stage</InputLabel>
                  <Select
                    labelId={`trigger-${i}-label`}
                    label="Stage"
                    value={item.trigger}
                    onChange={(e) =>
                      handleInstallmentChange(i, "trigger", e.target.value)
                    }
                  >
                    {TRIGGER_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton
                  size="small"
                  onClick={() => handleRemoveInstallment(i)}
                  aria-label={`Remove payment ${i + 1}`}
                  sx={{ color: "grey.500" }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      <Stack direction="row" spacing={2} alignItems="center">
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddPayment}
        >
          Add payment
        </Button>

        {value.installments.length > 0 && (
          <Chip
            label={`Sum: ${percentageSum.toFixed(0)}%`}
            color={sumOk ? "success" : "warning"}
            size="small"
            variant="outlined"
          />
        )}
      </Stack>

      {value.installments.length > 0 && !sumOk && (
        <Alert severity="warning" sx={{ py: 0 }}>
          Payment percentages should add up to 100% (currently{" "}
          {percentageSum.toFixed(1)}%).
        </Alert>
      )}
    </Stack>
  );
}
