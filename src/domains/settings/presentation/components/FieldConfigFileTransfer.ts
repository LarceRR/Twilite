import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

import type { FieldConfig } from '@/domains/spaces/presentation/field/fieldConfig';

import { parseFieldConfigJson, serializeFieldConfigJson } from './fieldConfigJson';

/** Export into a temporary JSON file and hand it to the native system share sheet. */
export async function exportFieldConfigFile(config: FieldConfig): Promise<void> {
  const fileName = `twilite-field-config-${Date.now()}.json`;
  const file = new File(Paths.cache, fileName);
  file.create();
  await file.write(serializeFieldConfigJson(config));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Системное меню передачи файлов недоступно на этом устройстве.');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Экспорт конфигурации поля',
  });
}

/** Open the system file picker and parse the selected Twilite config JSON. */
export async function importFieldConfigFile(): Promise<FieldConfig | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', 'application/octet-stream'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;

  const selected = result.assets[0];
  if (selected === undefined) return null;

  const file = new File(selected.uri);
  return parseFieldConfigJson(await file.text());
}
