/** Shared input length limits for MCP tool args */
export const LIMITS = {
  SHORT: 200,
  MEDIUM: 500,
  LONG: 8000,
  BODY: 50000,
} as const;

export function clampString(value: string | undefined, max: number): string | undefined {
  if (value === undefined) return undefined;
  if (value.length <= max) return value;
  return value.slice(0, max);
}

export function requireBoundedString(
  value: unknown,
  field: string,
  max: number,
  { allowEmpty = false }: { allowEmpty?: boolean } = {}
): string {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }
  if (!allowEmpty && value.trim() === "") {
    throw new Error(`${field} is required`);
  }
  if (value.length > max) {
    throw new Error(`${field} exceeds maximum length of ${max}`);
  }
  return value;
}
