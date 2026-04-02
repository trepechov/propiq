"use client";

/**
 * PaymentSchemesPanel — tabbed interface for managing all payment schemes.
 *
 * Owns its own schemes state (loaded from DB) so tab switches after create/delete
 * are always in sync — no parent prop-cycle race condition.
 *
 * Layout:
 *   [20-80 (Default)] [90-10  +150 EUR/m²] [+]
 *   ──────────────────────────────────────────
 *   <inline scheme editor for active tab>
 */

import { useState, useEffect, useCallback } from "react";
import { Box, Chip, CircularProgress, Stack, Tab, Tabs, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
  getPaymentSchemes,
  savePaymentScheme,
  updatePaymentScheme,
  deletePaymentScheme,
  setDefaultScheme,
} from "@/lib/supabase/projectPaymentSchemes";
import type {
  ProjectPaymentScheme,
  ProjectPaymentSchemeInsert,
} from "@/types/projectPaymentScheme";
import SchemeTabPanel from "./SchemeTabPanel";
import NewSchemeTabPanel from "./NewSchemeTabPanel";

interface Props {
  projectId: string;
  currency?: string | null;
}

const NEW_TAB = "__new__";

export default function PaymentSchemesPanel({ projectId, currency }: Props) {
  const [schemes, setSchemes] = useState<ProjectPaymentScheme[]>([]);
  const [activeTab, setActiveTab] = useState<string>(NEW_TAB);
  const [loading, setLoading] = useState(true);

  const currencySymbol = currency ?? "EUR";

  const loadSchemes = useCallback(async () => {
    const data = await getPaymentSchemes(projectId);
    setSchemes(data);
    return data;
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    loadSchemes()
      .then((data) => setActiveTab(data[0]?.id ?? NEW_TAB))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  function handleTabChange(_: React.SyntheticEvent, value: string) {
    setActiveTab(value);
  }

  async function handleSaveScheme(id: string, data: Partial<ProjectPaymentSchemeInsert>) {
    await updatePaymentScheme(id, data);
    await loadSchemes();
  }

  async function handleDeleteScheme(id: string) {
    await deletePaymentScheme(id);
    const data = await loadSchemes();
    setActiveTab(data[0]?.id ?? NEW_TAB);
  }

  async function handleSetDefault(id: string) {
    await setDefaultScheme(projectId, id);
    await loadSchemes();
  }

  async function handleCreateScheme(
    data: Omit<ProjectPaymentSchemeInsert, "project_id" | "is_default">,
  ) {
    const created = await savePaymentScheme({ ...data, project_id: projectId, is_default: false });
    await loadSchemes();
    setActiveTab(created.id);
  }

  if (loading) {
    return (
      <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, mb: 2, p: 2 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, mb: 2 }}>
      <Box sx={{ px: 2, pt: 1.5, pb: 0 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Payment Schemes
        </Typography>

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 40 }}
        >
          {schemes.map((scheme) => (
            <Tab
              key={scheme.id}
              value={scheme.id}
              sx={{ minHeight: 40, textTransform: "none", py: 0.5 }}
              label={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <span>{scheme.name}</span>
                  {scheme.is_default && (
                    <Chip label="Default" size="small" sx={{ height: 18, fontSize: "0.65rem" }} />
                  )}
                  {!scheme.is_default && (
                    <Chip
                      label={`${scheme.price_modifier_sqm >= 0 ? "+" : ""}${scheme.price_modifier_sqm} ${currencySymbol}/m²`}
                      size="small"
                      color={scheme.price_modifier_sqm > 0 ? "error" : scheme.price_modifier_sqm < 0 ? "success" : "default"}
                      variant="outlined"
                      sx={{ height: 18, fontSize: "0.65rem" }}
                    />
                  )}
                </Stack>
              }
            />
          ))}
          <Tab value={NEW_TAB} sx={{ minHeight: 40, minWidth: 40, px: 1 }} icon={<AddIcon fontSize="small" />} aria-label="Add new payment scheme" />
        </Tabs>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        {schemes.map((scheme) =>
          activeTab === scheme.id ? (
            <SchemeTabPanel
              key={scheme.id}
              scheme={scheme}
              currency={currencySymbol}
              onSave={handleSaveScheme}
              onDelete={handleDeleteScheme}
              onSetDefault={handleSetDefault}
            />
          ) : null,
        )}
        {activeTab === NEW_TAB && (
          <NewSchemeTabPanel currency={currencySymbol} onCreate={handleCreateScheme} />
        )}
      </Box>
    </Box>
  );
}
