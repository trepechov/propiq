# Frontend Design System

> **Purpose**: UI patterns, component conventions, and styling standards for PropIQ.
>
> **Related Docs**:
> - `ARCHITECTURE_GUIDE.md` - System design and patterns
> - `CODEBASE_MAP.md` - File locations and navigation
> - `CODE_PRINCIPLES.md` - Code quality standards

---

## UI Library

**MUI v5** (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`)

- Use MUI components for **all UI elements** — do not write custom CSS components where MUI covers the use case.
- Do not mix MUI with other component libraries (no shadcn/ui, no Radix, no Headless UI).
- Use MUI's `sx` prop for one-off style overrides; avoid inline `style` props.
- Use MUI's `theme` for shared tokens (colors, spacing, typography) — do not hardcode hex values.

---

## Responsive Layout

Support three breakpoints using MUI's default grid:

| Breakpoint | Width | Target device |
|------------|-------|---------------|
| `xs` | < 600px | Mobile |
| `sm` / `md` | 600–960px | Tablet |
| `lg` / `xl` | > 960px | Desktop |

### Rules

- All pages must be usable on mobile — no horizontal scroll, no hidden content.
- Use `<Container maxWidth="xl">` as the top-level page wrapper.
- Use MUI `<Grid>` or `<Stack>` for layout — never raw CSS grid/flexbox for page structure.
- Tables (`<DataGrid>` or MUI `<Table>`) must horizontally scroll on mobile, not overflow the viewport.
- Dialogs/drawers for add/edit forms: use `fullScreen` on `xs` breakpoint.

### Breakpoint pattern

```tsx
// Responsive columns example
<Grid container spacing={2}>
  <Grid item xs={12} md={6} lg={4}>
    ...
  </Grid>
</Grid>

// Responsive dialog
<Dialog fullScreen={isMobile} ...>
```

---

## Page Layout Pattern

Every page follows this structure:

```tsx
<Container maxWidth="xl" sx={{ py: 3 }}>
  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
    <Typography variant="h5">Page Title</Typography>
    <Button variant="contained">Primary Action</Button>
  </Stack>

  {/* Main content — table, cards, etc. */}
</Container>
```

---

## Component Conventions

### Tables

- Use MUI `<Table>` with `<TableContainer component={Paper}>` for data tables.
- Add `stickyHeader` for long lists.
- Rows are clickable for edit — use `hover` cursor and `TableRow hover`.
- On mobile, wrap `TableContainer` with `overflow: 'auto'` to enable horizontal scroll.

### Forms (Add / Edit)

- Open in a MUI `<Dialog>` (not a separate page).
- `fullScreen` on mobile (`xs` breakpoint).
- Single `<TextField multiline>` for AI input; extracted fields rendered as individual `<TextField>` components below.
- Action buttons: Cancel (outlined) + Save (contained) — right-aligned in `<DialogActions>`.

### Feedback / Status

- Loading: `<CircularProgress>` centered in the content area.
- Errors: MUI `<Alert severity="error">` below the triggering element.
- Success toasts: MUI `<Snackbar>` with `<Alert severity="success">`, auto-hide 3 s.
- Empty state: centered `<Typography color="text.secondary">` with an action button.

---

## MUI Installation

```bash
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
```

Wrap the app in `<ThemeProvider>` and `<CssBaseline>` in `main.tsx`.

---

*Update this file when new UI patterns are established or component APIs are finalized.*
