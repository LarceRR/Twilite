import { useMemo } from 'react';

import {
  type FieldConfig,
  fieldGridColsFromConfig,
  mergeFieldConfig,
} from './fieldConfig';
import { useFieldConfigStore } from './fieldConfigStore';
import { createFieldGridConfig, type FieldGridConfig } from './fieldGridConfig';

export { getFieldConfig } from './fieldConfigStore';

/** React hook: full merged Field Space config (defaults + overrides). */
export function useFieldConfig(): FieldConfig {
  const overrides = useFieldConfigStore((s) => s.overrides);
  return useMemo(() => mergeFieldConfig(overrides), [overrides]);
}

/** React hook: grid layout derived from the runtime field config. */
export function useFieldGridConfig(): FieldGridConfig {
  const config = useFieldConfig();
  return useMemo(
    () =>
      createFieldGridConfig(
        fieldGridColsFromConfig(config.grid),
        config.grid.rows,
        config.grid.cellSizePx,
      ),
    [config.grid],
  );
}
