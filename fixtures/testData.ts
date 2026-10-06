// Unique per run so Salesforce duplicate rules ("Similar Records Exist") don't block Save.
export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}@example.com`;
}

export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}
