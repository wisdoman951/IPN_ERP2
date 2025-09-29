const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

const sanitizeValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return value.toString();
  }
  return String(value);
};

const isEmpty = (value: string) => value.length === 0;

export const createStoreMemberComparator = <T,>(
  getStore: (item: T) => unknown,
  getMemberCode: (item: T) => unknown,
  getFallback?: (item: T) => unknown
) => {
  return (a: T, b: T) => {
    const storeA = sanitizeValue(getStore(a));
    const storeB = sanitizeValue(getStore(b));
    const storeAEmpty = isEmpty(storeA);
    const storeBEmpty = isEmpty(storeB);

    if (storeAEmpty !== storeBEmpty) {
      return storeAEmpty ? 1 : -1;
    }

    const storeComparison = collator.compare(storeA, storeB);
    if (storeComparison !== 0) {
      return storeComparison;
    }

    const codeA = sanitizeValue(getMemberCode(a));
    const codeB = sanitizeValue(getMemberCode(b));
    const codeAEmpty = isEmpty(codeA);
    const codeBEmpty = isEmpty(codeB);

    if (codeAEmpty !== codeBEmpty) {
      return codeAEmpty ? 1 : -1;
    }

    const codeComparison = collator.compare(codeA, codeB);
    if (codeComparison !== 0) {
      return codeComparison;
    }

    if (getFallback) {
      const fallbackA = sanitizeValue(getFallback(a));
      const fallbackB = sanitizeValue(getFallback(b));
      if (!isEmpty(fallbackA) || !isEmpty(fallbackB)) {
        const fallbackComparison = collator.compare(fallbackA, fallbackB);
        if (fallbackComparison !== 0) {
          return fallbackComparison;
        }
      }
    }

    return 0;
  };
};

export const sortByStoreAndMemberCode = <T,>(
  items: T[],
  getStore: (item: T) => unknown,
  getMemberCode: (item: T) => unknown,
  getFallback?: (item: T) => unknown
): T[] => {
  const comparator = createStoreMemberComparator(getStore, getMemberCode, getFallback);
  return [...items].sort(comparator);
};
