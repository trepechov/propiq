/**
 * Opportunity Search page — /search
 *
 * User types a natural language query describing their investment criteria.
 * Gemini evaluates all stored projects + available units against the query
 * and returns up to 5 matching and 5 non-matching opportunities.
 *
 * Each result card includes project/unit details, an AI-generated reason,
 * an optional score badge, and a thumbs-up / thumbs-down feedback widget.
 */

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { searchOpportunities } from "../services/searchOpportunities";
import type { SearchResult } from "../services/searchOpportunities";
import { ResultsColumn, MatchType } from "./SearchPage.helpers";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

// ── Page component ────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const searchResult = await searchOpportunities(trimmed);
      setResult(searchResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Search failed — please try again",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSearch();
    }
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Page header */}
      <Typography variant="h5" mb={3}>
        Opportunity Search
      </Typography>

      {/* Query input */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mb={3}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          placeholder='Describe what you are looking for — e.g. "2-bed apartment, south facing, under 120k EUR, good yield, low risk stage"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={loading || query.trim().length === 0}
          sx={{
            alignSelf: { sm: "flex-start" },
            mt: { sm: "0 !important" },
            whiteSpace: "nowrap",
            px: 3,
          }}
        >
          Find Opportunities
        </Button>
      </Stack>

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Stats bar */}
      {result && !loading && (
        <Alert severity="info" sx={{ py: 0, mb: 2 }}>
          {formatDuration(result.meta.durationMs)} ·{" "}
          {result.meta.tokens.toLocaleString()} tokens ·{" "}
          {result.matching.length} matching, {result.nonMatching.length}{" "}
          non-matching
        </Alert>
      )}

      {/* Results */}
      {result && !loading && (
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          alignItems="flex-start"
        >
          <ResultsColumn
            title="Matching"
            results={result.matching}
            matchType={MatchType.MATCHING}
            queryText={query.trim()}
            color="success.main"
          />
          <ResultsColumn
            title="Does Not Match"
            results={result.nonMatching}
            matchType={MatchType.NON_MATCHING}
            queryText={query.trim()}
            color="warning.main"
          />
        </Stack>
      )}

      {/* Empty state before first search */}
      {!result && !loading && !error && (
        <Box textAlign="center" py={10}>
          <Typography color="text.secondary">
            Describe what you are looking for and click{" "}
            <strong>Find Opportunities</strong>.
          </Typography>
          <Typography
            variant="caption"
            color="text.disabled"
            mt={1}
            display="block"
          >
            Tip: include budget, preferred stage, orientation, or yield targets.
          </Typography>
        </Box>
      )}
    </Container>
  );
}
