import { Directory, File, Paths } from 'expo-file-system';

import { customersToCsv } from '@/lib/csv';
import { getAllCustomersForExport } from '@/lib/queries';

export async function createSafetySnapshot(): Promise<void> {
  const allCustomers = await getAllCustomersForExport();
  const csv = customersToCsv(allCustomers);

  const backupsDir = new Directory(Paths.document, 'backups');
  backupsDir.create({ intermediates: true, idempotent: true });

  const file = new File(backupsDir, `pre-import-${Date.now()}.csv`);
  file.create();
  file.write(csv);
}
