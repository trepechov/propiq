/**
 * Extracted-fields form section for ProjectForm.
 *
 * Renders all editable project fields once AI extraction has completed.
 * Kept in a separate file to keep ProjectForm.tsx within the 300-line limit.
 */

import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import type { ProjectInsert, Neighborhood } from '../types'
import { BuildingStage, BUILDING_STAGE_LABELS } from '../config/domain'

export type FieldValues = Omit<ProjectInsert, 'neighborhood_id'> & { neighborhood_id: string }

export interface ProjectFieldsProps {
  fields: FieldValues
  neighborhoods: Neighborhood[]
  setField: <K extends keyof FieldValues>(key: K, value: FieldValues[K]) => void
  numOrNull: (raw: string) => number | null
}

export default function ProjectFields({
  fields,
  neighborhoods,
  setField,
  numOrNull,
}: ProjectFieldsProps) {
  return (
    <>
      <TextField
        label="Title"
        value={fields.title}
        onChange={(e) => setField('title', e.target.value)}
        fullWidth
        required
      />

      <FormControl fullWidth>
        <InputLabel id="neighborhood-label">Neighborhood</InputLabel>
        <Select
          labelId="neighborhood-label"
          label="Neighborhood"
          value={fields.neighborhood_id}
          onChange={(e) => setField('neighborhood_id', e.target.value)}
        >
          {neighborhoods.map((n) => (
            <MenuItem key={n.id} value={n.id}>
              {n.name} — {n.city}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel id="stage-label">Stage</InputLabel>
        <Select
          labelId="stage-label"
          label="Stage"
          value={fields.current_stage}
          onChange={(e) => setField('current_stage', e.target.value as BuildingStage)}
        >
          {Object.values(BuildingStage).map((v) => (
            <MenuItem key={v} value={v}>
              {BUILDING_STAGE_LABELS[v]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Completion Date"
        type="date"
        value={fields.completion_date ?? ''}
        onChange={(e) => setField('completion_date', e.target.value || null)}
        fullWidth
        InputLabelProps={{ shrink: true }}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Price / m²"
          type="number"
          value={fields.price_sqm ?? ''}
          onChange={(e) => setField('price_sqm', numOrNull(e.target.value))}
          fullWidth
        />
        <TextField
          label="Currency"
          value={fields.currency ?? ''}
          onChange={(e) => setField('currency', e.target.value || null)}
          fullWidth
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Total Apartments"
          type="number"
          value={fields.total_apartments ?? ''}
          onChange={(e) => setField('total_apartments', numOrNull(e.target.value))}
          fullWidth
        />
        <TextField
          label="Total Floors"
          type="number"
          value={fields.total_floors ?? ''}
          onChange={(e) => setField('total_floors', numOrNull(e.target.value))}
          fullWidth
        />
      </Stack>

      <TextField
        label="Developer"
        value={fields.developer ?? ''}
        onChange={(e) => setField('developer', e.target.value || null)}
        fullWidth
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Source (Agency)"
          value={fields.source ?? ''}
          onChange={(e) => setField('source', e.target.value || null)}
          fullWidth
        />
        <TextField
          label="Commission"
          value={fields.commission ?? ''}
          onChange={(e) => setField('commission', e.target.value || null)}
          fullWidth
        />
      </Stack>

      <TextField
        label="Notes"
        multiline
        rows={3}
        value={fields.notes ?? ''}
        onChange={(e) => setField('notes', e.target.value || null)}
        fullWidth
      />

      <TextField
        label="Building Notes"
        multiline
        rows={3}
        value={fields.building_notes ?? ''}
        onChange={(e) => setField('building_notes', e.target.value || null)}
        fullWidth
      />
    </>
  )
}
