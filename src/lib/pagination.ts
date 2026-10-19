/** Safe page/limit parsing for list endpoints: integers, page >= 1, 1 <= limit <= max. */
export function parsePaging(
  searchParams: URLSearchParams,
  { defaultLimit = 20, maxLimit = 100 }: { defaultLimit?: number; maxLimit?: number } = {}
) {
  const int = (v: string | null, d: number) => {
    const n = Number.parseInt(v ?? "", 10);
    return Number.isFinite(n) ? n : d;
  };
  const page = Math.max(1, int(searchParams.get("page"), 1));
  const limit = Math.min(maxLimit, Math.max(1, int(searchParams.get("limit"), defaultLimit)));
  return { page, limit, skip: (page - 1) * limit };
}
